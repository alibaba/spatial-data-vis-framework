import { MeshDataType } from '@gs.i/schema'
import { computeBBox, computeBSphere } from '@gs.i/utils-geometry'
import { XYZTileManager, TileRenderables, TileToken } from '@polaris.gl/utils-tile-manager'
import { RequestPending, XYZTileRequestManager } from '@polaris.gl/utils-request-manager'
import { STDLayer, STDLayerProps } from '@polaris.gl/layer-std'
import { Mesh, MatrUnlit, Geom, Attr } from '@gs.i/frontend-sdk'
import { Base, CoordV2, CoordV3, PickEvent, Polaris } from '@polaris.gl/schema'
import Pbf from 'pbf'
import { decode } from 'geobuf'
import { Projection } from '@polaris.gl/projection'
import { colorToUint8Array } from '@polaris.gl/utils'
import { PolarisGSI } from '@polaris.gl/gsi'
import { Color } from '@gs.i/utils-math'
import { triangulateGeoJSON, featureToLinePositions, createRangeArray } from './utils'
import { LineIndicator } from '@polaris.gl/utils-indicator'

/**
 * 配置项 interface
 */
export interface AOILayerProps extends STDLayerProps {
	/**
	 * Tile response data type
	 */
	dataType: 'auto' | 'geojson' | 'pbf'

	/**
	 * Pass in a user customized RequestManager to replace the default one
	 * Set a requestManager from outside and managed by user to let different layers share the same http resources.
	 */
	requestManager?: XYZTileRequestManager

	/**
	 * URL generator for xyz tile
	 */
	getUrl: (x: number, y: number, z: number) => string | { url: string; requestParams?: any }

	/**
	 * The id key in feature.properties is essential for XYZ tiles,
	 * especially for user interactions such as styling/picking.
	 * The default feature is 'id', but you can change it for your own applications.
	 * This property value should be UNIQUE for each valid geo feature in tile data.
	 * @NOTE Clustered features MAY not have id prop in properties
	 */
	featureIdKey: string

	/**
	 * Geometry base alt
	 */
	baseAlt: number

	/**
	 * default is 3
	 */
	minZoom?: number

	/**
	 * default is 20
	 */
	maxZoom?: number

	/**
	 * get feature color
	 */
	getColor: number | string | ((feature: any) => number | string)

	/**
	 * get feature opacity
	 */
	getOpacity: number | ((feature: any) => number)

	/**
	 * is AOIs transparent
	 */
	transparent: boolean

	/**
	 * Indicator lines base height
	 */
	indicatorLinesHeight: number

	/**
	 * Hover LineIndicator level
	 */
	hoverLineLevel: number

	/**
	 *
	 */
	hoverLineWidth: number

	/**
	 *
	 */
	hoverLineColor: number | string

	/**
	 * Select LineIndicator level
	 */
	selectLineLevel: number

	/**
	 *
	 */
	selectLineWidth: number

	/**
	 *
	 */
	selectLineColor: number | string

	/**
	 * Custom geojson filter
	 */
	geojsonFilter?: (geojson: any) => any

	/**
	 * Custom feature filter, return true to set this feature as valid feature
	 * @return => {false} to skip this feature
	 */
	featureFilter?: (feature: any) => boolean

	/**
	 * Stable frames before sending tile requests
	 */
	framesBeforeRequest?: number

	/**
	 * The limit of tile cache count
	 * default is 512
	 */
	cacheSize?: number

	/**
	 * User customized fetch method to replace the default layer fetcher
	 * If this prop has been set, the 'getUrl' props will be ignored
	 */
	customFetcher?: (x: number, y: number, z: number) => RequestPending

	/**
	 * User customized fetch cache key generator
	 */
	customTileKeyGen?: (x: number, y: number, z: number) => string

	/**
	 * Increasing view zoom reduction will let layer request less but lower level tiles
	 * This may help with low fetching speed problem
	 */
	viewZoomReduction?: number

	/**
	 * TileManager tile update strategy option
	 * use replacement method when current vis tiles are in pending states
	 * default is true
	 */
	useParentReplaceUpdate?: boolean
}

/**
 * 配置项 默认值
 */
const defaultProps: AOILayerProps = {
	dataType: 'auto',
	getUrl: (x, y, z) => {
		throw new Error('getUrl prop is not defined')
	},
	minZoom: 3,
	maxZoom: 20,
	featureIdKey: 'id',
	baseAlt: 0,
	getColor: '#ffffff',
	getOpacity: 1.0,
	transparent: false,
	indicatorLinesHeight: 0,
	hoverLineLevel: 2,
	hoverLineWidth: 1,
	hoverLineColor: '#333333',
	selectLineLevel: 2,
	selectLineWidth: 2,
	selectLineColor: '#00ffff',
	framesBeforeRequest: 10,
	cacheSize: 512,
	viewZoomReduction: 0,
	useParentReplaceUpdate: true,
}

type IndicatorRangeInfo = {
	hoverIndicator: LineIndicator
	selectIndicator: LineIndicator
	ranges: { offset: number; count: number }[]
}

export class AOILayer extends STDLayer {
	matr: MatrUnlit

	requestManager: XYZTileRequestManager

	tileManager: XYZTileManager

	/**
	 * Performance info
	 */
	info: { times: Map<number | string, { reqTime: number; genTime: number }> }

	/**
	 * For feature.index counter
	 * @NOTE this count will always increment even tiles may be released from memory, also means it will not decrease in any cases.
	 */
	private _featureCount: number

	/**
	 * Map for Mesh <-> Feature relations
	 */
	private _renderableFeatureMap: Map<MeshDataType, any[]>

	/**
	 * Map for Feature <-> GeomIndexRange in the current Mesh
	 * RangeType: [start, end]
	 */
	private _featureIndexRangeMap: Map<any, Uint8Array | Uint16Array | Uint32Array>

	/**
	 * LineIndicators list
	 */
	private _indicators: Set<LineIndicator>

	/**
	 * Map for hover/pick styles
	 */
	private _idIndicatorRangeMap: Map<number | string, IndicatorRangeInfo[]>

	/**
	 * Map for storing styled feature ids
	 * for setting styles among different tiles for the same geo
	 */
	private _hoveredIds: Set<number | string>

	private _selectedIds: Set<number | string>

	constructor(props: Partial<AOILayerProps> = {}) {
		const _props = {
			...defaultProps,
			...props,
		}
		super(_props)
		this.name = this.group.name = 'AOILayer'
	}

	/**
	 * highlight api for TileLayers
	 */
	highlightByIds: (idsArr: number[], style: { [name: string]: any }) => void

	init(projection, timeline, polaris) {
		const p = polaris as Polaris

		if (!projection.isPlaneProjection) {
			throw new Error('AOILayer - TileLayer can only be used in plane projections')
		}

		this.listenProps(
			[
				'dataType',
				'getUrl',
				'minZoom',
				'maxZoom',
				'featureIdKey',
				'baseAlt',
				'getColor',
				'getOpacity',
				'transparent',
				'indicatorLinesHeight',
				'hoverLineLevel',
				'hoverLineWidth',
				'hoverLineColor',
				'selectLineLevel',
				'selectLineWidth',
				'selectLineColor',
				'geojsonFilter',
				'featureFilter',
				'framesBeforeRequest',
				'customFetcher',
				'customTileKeyGen',
				'cacheSize',
				'viewZoomReduction',
				'useParentReplaceUpdate',
			],
			() => {
				this._featureCount = 0

				this._renderableFeatureMap = new Map()

				this._featureIndexRangeMap = new Map()

				this._idIndicatorRangeMap = new Map()

				this._hoveredIds = new Set()

				this._selectedIds = new Set()

				this._indicators = new Set()

				this.info = {
					times: new Map(),
				}

				this.matr = this._createPolygonMatr()

				const dtConfig = this.getProps('dataType')
				let dataType
				switch (dtConfig) {
					case 'pbf': {
						dataType = 'arraybuffer'
						break
					}
					case 'geojson': {
						dataType = 'json'
						break
					}
					case 'auto': {
						dataType = 'auto'
						break
					}
					default: {
						throw new Error(`Invalid dataType prop value: ${dtConfig}`)
					}
				}

				if (this.requestManager) {
					this.requestManager.dispose()
				}

				const customFetcher = this.getProps('customFetcher')
				const customTileKeyGen = this.getProps('customTileKeyGen')
				this.requestManager =
					this.getProps('requestManager') ??
					new XYZTileRequestManager({
						dataType,
						fetcher: customFetcher ? ({ x, y, z }) => customFetcher(x, y, z) : undefined,
						getCacheKey: customTileKeyGen ? ({ x, y, z }) => customTileKeyGen(x, y, z) : undefined,
						getUrl: (requestArgs) => {
							return this.getProps('getUrl')(requestArgs.x, requestArgs.y, requestArgs.z)
						},
					})

				if (this.tileManager) {
					this.tileManager.dispose()
				}

				this.tileManager = new XYZTileManager({
					layer: this,
					minZoom: this.getProps('minZoom'),
					maxZoom: this.getProps('maxZoom'),
					cacheSize: this.getProps('cacheSize'),
					framesBeforeUpdate: this.getProps('framesBeforeRequest'),
					viewZoomReduction: this.getProps('viewZoomReduction'),
					useParentReplaceUpdate: this.getProps('useParentReplaceUpdate'),
					getTileRenderables: (tileToken) => {
						return this._createTileRenderables(tileToken, projection, polaris)
					},
					onTileRelease: (tile, token) => {
						this._releaseTile(tile, token)
					},
				})

				this.tileManager.start()
			}
		)

		// update indicators' resolution uniform
		this.onViewChange = () => {
			this._indicators.forEach((indicator) => {
				indicator.updateResolution(polaris.width, polaris.height)
			})
		}

		/** picking */
		this.onHover = this._pickAOI
		this.onClick = this._pickAOI

		/** highlight api */
		// this.highlightByIndices = (dataIndexArr: number[], style: { [name: string]: any }) => {
		// 	console.error(
		// 		'AOILayer - This method is not implemented, please use .highlightByIds() instead. '
		// 	)
		// }

		/** highlight api 2 */
		this.highlightByIds = (idsArr: (number | string)[], style: { [name: string]: any }) => {
			const type = style.type
			if (type !== 'hover' && type !== 'select' && type !== 'none') {
				console.error(`AOILayer - Invalid argument style.type: ${style}`)
				return
			}
			idsArr.forEach((id) => {
				this._setStyleById(id, type)
				// cache or delete style
				if (type === 'none') {
					this._hoveredIds.delete(id)
					this._selectedIds.delete(id)
				} else if (type === 'hover') {
					this._hoveredIds.add(id)
				} else if (type === 'select') {
					this._selectedIds.add(id)
				}
			})
		}
	}

	dispose() {
		this._featureCount = 0
		this.info.times = new Map()
		this._renderableFeatureMap = new Map()
		this._featureIndexRangeMap = new Map()
		this._idIndicatorRangeMap = new Map()
		this._hoveredIds = new Set()
		this._selectedIds = new Set()
		this._indicators = new Set()
		this.requestManager.dispose()
		this.tileManager.dispose()
	}

	getState() {
		const pendsCount = this.tileManager ? this.tileManager.getPendsCount() : undefined
		return {
			pendsCount,
		}
	}

	private _createTileRenderables(token, projection, polaris) {
		const dataType = this.getProps('dataType')
		const geojsonFilter = this.getProps('geojsonFilter')
		const x = token[0],
			y = token[1],
			z = token[2]

		const requestPending = this.requestManager.request({ x, y, z })
		const cacheKey = this._getCacheKey(x, y, z)

		// perf indicator
		this.info.times.set(cacheKey, { reqTime: performance.now(), genTime: 0 })

		const promise = new Promise<TileRenderables>((resolve, reject) => {
			requestPending.promise
				.then((data) => {
					// Perf log
					const time = this.info.times.get(cacheKey)
					if (time) {
						time.reqTime = performance.now() - time.reqTime
						time.genTime = performance.now()
					}

					let geojson: any

					const emptyTile = {
						meshes: [],
						layers: [],
					}

					// parse response to geojson
					if (dataType === 'pbf') {
						geojson = decode(new Pbf(data))
					} else if (dataType === 'geojson') {
						geojson = data
					} else if (dataType === 'auto') {
						if (data.constructor === ArrayBuffer) {
							geojson = decode(new Pbf(data))
						} else if (typeof data === 'string') {
							geojson = JSON.parse(data)
						} else if (typeof data === 'object') {
							geojson = data
						}
					} else {
						console.error(`Invalid dataType prop value: ${dataType}`)
						resolve(emptyTile)
						return
					}

					geojson = geojsonFilter ? geojsonFilter(geojson) : geojson

					if (
						!geojson.type ||
						geojson.type !== 'FeatureCollection' ||
						!geojson.features ||
						!Array.isArray(geojson.features)
					) {
						console.warn(
							`AOILayer - Tile source is not a valid GeoJSON, skip. Use 'geojsonFilter' to modify the response data if necessary. `
						)
						resolve(emptyTile)
						return
					}

					if (geojson.features.length > 0) {
						const tile = this._createTileMesh(geojson, projection, polaris, cacheKey)

						if (time) {
							time.genTime = performance.now() - time.genTime
						}

						if (tile) {
							resolve(tile)
							return
						}
					}

					resolve(emptyTile)
				})
				.catch((e) => {
					reject(e)
				})
		})

		return {
			promise,
			abort: requestPending.abort,
		}
	}

	private _createPolygonMatr() {
		const transparent = this.getProps('transparent')
		const matr = new MatrUnlit({
			alphaMode: transparent ? 'BLEND' : 'OPAQUE',
			depthTest: this.getProps('depthTest'),
			baseColorFactor: { r: 1, g: 1, b: 1 },
			uniforms: {},
			attributes: {
				aColor: 'vec4',
			},
			varyings: {
				vColor: 'vec4',
			},
			vertOutput: `
				vColor = aColor / 255.0;
			`,
			fragColor: `
				fragColor = vColor;
			`,
		})
		return matr
	}

	private _createTileMesh(
		geojson: any,
		projection: Projection,
		polaris: Polaris,
		key?: string
	): TileRenderables | undefined {
		if (!geojson.type || geojson.type !== 'FeatureCollection') {
			return
		}

		const mesh = new Mesh({
			name: key ? key : 'aois',
			renderOrder: this.getProps('renderOrder'),
			extras: { isAOI: true },
		})

		// styles
		const featureIdKey = this.getProps('featureIdKey')
		const baseAlt = this.getProps('baseAlt')
		const featureFilter = this.getProps('featureFilter')
		const getColor = this.getProps('getColor')
		const getOpacity = this.getProps('getOpacity')
		const lineHeight = this.getProps('indicatorLinesHeight')
		const pickable = this.getProps('pickable')

		// caches
		const meshFeatures: any[] = []
		const tileRenderables: Mesh[] = []
		const idLineRangeMap: Map<number | string, { offset: number; count: number }[]> = new Map()

		// attrs
		const positions: number[] = []
		const colors: number[] = []
		const indices: number[] = []
		const linePosArr: number[][] = []
		let linePosOffset = 0
		let offset = 0

		geojson.features.forEach((feature) => {
			if (!feature.geometry) {
				return
			}
			const geometry = feature.geometry

			// apply filter
			if (featureFilter) {
				const filterResult = featureFilter(feature)
				if (filterResult === undefined || filterResult === false) {
					return
				}
			}

			// add 'index' prop to feature
			feature.index = this._featureCount
			this._featureCount++

			const id = feature.properties[featureIdKey] as number | string

			if (id === undefined || id === null) {
				console.error(`AOILayer - No feature id prop found, skip`)
				return
			}

			if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
				/**
				 * Polygon
				 */
				const result = triangulateGeoJSON(feature)
				const { points, triangles } = result

				const indexStart = indices.length
				// const indexRange = new Uint32Array([indices.length, 0])
				// const colorRange = new Uint32Array([offset * 4, 0])

				for (let i = 0; i < points.length; i += 2) {
					const xyz = projection.project(points[i], points[i + 1], baseAlt)
					positions.push(...xyz)
				}
				for (let i = 0; i < triangles.length; i++) {
					indices.push(triangles[i] + offset)
				}

				const count = points.length / 2
				const offset4 = offset * 4
				const color = new Color(getColor(feature))
				const alpha = getOpacity(feature) ?? 1.0
				const colorUint = colorToUint8Array(color, alpha)
				for (let i = 0; i < count; i++) {
					const i4 = offset4 + i * 4
					colors[i4 + 0] = colorUint[0]
					colors[i4 + 1] = colorUint[1]
					colors[i4 + 2] = colorUint[2]
					colors[i4 + 3] = colorUint[3]
				}

				offset += count

				// Store index range for feature
				const indexEnd = indices.length - 1
				// indexRange[1] = indices.length - 1

				// // Store feature vert range
				// colorRange[1] = offset * 4

				this._featureIndexRangeMap.set(feature, createRangeArray(indexStart, indexEnd))
			} else if (
				pickable &&
				(geometry.type === 'LineString' || geometry.type === 'MultiLineString')
			) {
				/**
				 * Outline
				 */
				const linePos = featureToLinePositions(feature, projection, baseAlt + lineHeight)
				if (linePos) {
					linePos.forEach((positions) => {
						linePosArr.push(positions)
						const range = {
							offset: linePosOffset,
							count: positions.length / 3,
						}

						const lineRanges = idLineRangeMap.get(id)
						if (lineRanges) {
							lineRanges.push(range)
						} else {
							idLineRangeMap.set(id, [range])
						}

						// update offset
						linePosOffset += positions.length / 3
					})
				}
			}

			meshFeatures.push(feature)
		})

		const posAttr = new Attr(new Float32Array(positions), 3)
		const colorAttr = new Attr(new Uint8Array(colors), 4)
		const indicesArray = offset > 65535 ? new Uint32Array(indices) : new Uint16Array(indices)
		const indicesAttr = new Attr(indicesArray, 1)

		const geom = new Geom({
			mode: 'TRIANGLES',
			attributes: {
				position: posAttr,
				aColor: colorAttr,
			},
			indices: indicesAttr,
		})

		computeBSphere(geom)
		computeBBox(geom)

		mesh.geometry = geom
		mesh.material = this.matr

		this._renderableFeatureMap.set(mesh, meshFeatures)

		// LineIndicators
		if (pickable && linePosArr.length > 0) {
			const { hoverIndicator, selectIndicator } = this._genLineIndicators(polaris, linePosArr)
			tileRenderables.push(hoverIndicator.gline, selectIndicator.gline)
			this._indicators.add(hoverIndicator)
			this._indicators.add(selectIndicator)
			this._cacheIndicatorRanges(idLineRangeMap, hoverIndicator, selectIndicator)
			idLineRangeMap.forEach((ranges, id) => {
				if (this._hoveredIds.has(id)) this._setStyleById(id, 'hover')
				if (this._selectedIds.has(id)) this._setStyleById(id, 'select')
			})
		}

		tileRenderables.push(mesh)

		return { meshes: tileRenderables, layers: [] }
	}

	private _genLineIndicators(polaris, selectPosArr: number[][]) {
		// Hover indicator
		const hoverLineWidth = this.getProps('hoverLineWidth') as number
		const hoverLineColor = this.getProps('hoverLineColor')
		const hoverLineLevel = this.getProps('hoverLineLevel')
		let hoverLevel = hoverLineLevel
		if (hoverLineWidth > 1 && hoverLineLevel === 1) {
			hoverLevel = 2
		}
		const hoverLineConfig = {
			level: hoverLevel,
			opacity: 1.0,
			lineWidth: hoverLineWidth,
			useColors: true,
			resolution: {
				x: polaris.width,
				y: polaris.height,
			},
			usePerspective: false,
			dynamic: true,
			u: false,
			texture: undefined,
			renderOrder: this.getProps('renderOrder'),
			depthTest: true,
			transparent: true,
		}
		const hoverIndicator = new LineIndicator(selectPosArr, hoverLineConfig, {
			defaultColor: new Color(0.0, 0.0, 0.0),
			defaultAlpha: 0.0,
			highlightColor: new Color(hoverLineColor),
			highlightAlpha: 1.0,
		})
		hoverIndicator.gline.extras.isHoverIndicator = true

		// Select indicator
		const selectLineWidth = this.getProps('selectLineWidth') as number
		const selectLineColor = this.getProps('selectLineColor')
		const selectLineLevel = this.getProps('selectLineLevel')
		let selectLevel = selectLineLevel
		if (selectLineWidth > 1 && selectLineLevel === 1) {
			selectLevel = 2
		}
		const selectLineConfig = {
			level: selectLevel,
			opacity: 1.0,
			lineWidth: selectLineWidth,
			useColors: true,
			resolution: {
				x: polaris.width,
				y: polaris.height,
			},
			usePerspective: false,
			dynamic: true,
			u: false,
			texture: undefined,
			renderOrder: this.getProps('renderOrder'),
			depthTest: true,
			transparent: true,
		}
		const selectIndicator = new LineIndicator(selectPosArr, selectLineConfig, {
			defaultColor: new Color(0.0, 0.0, 0.0),
			defaultAlpha: 0.0,
			highlightColor: new Color(selectLineColor),
			highlightAlpha: 1.0,
		})
		selectIndicator.gline.extras.isSelectIndicator = true

		return {
			hoverIndicator,
			selectIndicator,
		}
	}

	private _getCacheKey(x: number | string, y: number | string, z: number | string) {
		return `${x}|${y}|${z}`
	}

	private _pickAOI(polaris: Base, canvasCoords: CoordV2, ndc: CoordV2): PickEvent | undefined {
		if (!this.tileManager || !(polaris instanceof PolarisGSI)) return
		const tiles = this.tileManager.getVisibleTiles()
		for (let i = 0; i < tiles.length; i++) {
			const tile = tiles[i]
			const meshes = tile.meshes
			const mesh = meshes.find((mesh) => mesh.extras && mesh.extras.isAOI)
			if (!mesh) return

			const pickResult = polaris.pick(mesh, ndc)
			if (pickResult.hit && pickResult.intersections && pickResult.intersections.length > 0) {
				const intersection = pickResult.intersections[0]
				const index = intersection.index
				const features = this._renderableFeatureMap.get(mesh)
				if (index === undefined || !features) return

				// find the hit feature by feature indexRange
				let hitFeature
				const indexTri = index * 3
				for (let j = 0; j < features.length; j++) {
					const feature = features[j]
					const indexRange = this._featureIndexRangeMap.get(feature)
					if (indexRange && indexTri >= indexRange[0] && indexTri <= indexRange[1]) {
						hitFeature = feature
						break
					}
				}

				if (!hitFeature) return

				const event: PickEvent = {
					distance: intersection.distance ?? 0,
					index: hitFeature.index,
					point: intersection.point as CoordV3,
					pointLocal: intersection.pointLocal as CoordV3,
					object: mesh,
					data: {
						feature: hitFeature,
						curr: hitFeature, // backward compatibility
					},
				}
				return event
			}
		}
	}

	private _cacheIndicatorRanges(
		idRangeMap: Map<number | string, { offset: number; count: number }[]>,
		hoverIndicator: LineIndicator,
		selectIndicator: LineIndicator
	) {
		idRangeMap.forEach((ranges, id) => {
			const rangeInfos = this._idIndicatorRangeMap.get(id)
			if (rangeInfos) {
				for (let i = 0; i < rangeInfos.length; i++) {
					const rangeInfo = rangeInfos[i]
					if (
						rangeInfo.hoverIndicator === hoverIndicator &&
						rangeInfo.selectIndicator === selectIndicator
					) {
						// append current ranges to cached info array
						rangeInfo.ranges = rangeInfo.ranges.concat(ranges)
						return
					}
				}
				// if not found same indicators info, set new one to cache list
				rangeInfos.push({
					hoverIndicator,
					selectIndicator,
					ranges,
				})
			} else {
				this._idIndicatorRangeMap.set(id, [
					{
						hoverIndicator,
						selectIndicator,
						ranges,
					},
				])
			}
		})
	}

	private _setStyleById(id: number | string, type: string) {
		const rangeInfos = this._idIndicatorRangeMap.get(id)
		if (!rangeInfos || !type) return
		rangeInfos.forEach((info) => {
			const { hoverIndicator, selectIndicator, ranges } = info
			if (type === 'hover') {
				ranges.forEach((range) => {
					hoverIndicator.updateHighlightByOffsetCount(range.offset, range.count)
				})
			} else if (type === 'select') {
				ranges.forEach((range) => {
					selectIndicator.updateHighlightByOffsetCount(range.offset, range.count)
				})
			} else if (type === 'none') {
				ranges.forEach((range) => {
					hoverIndicator.restoreHighlightByOffsetCount(range.offset, range.count)
					selectIndicator.restoreHighlightByOffsetCount(range.offset, range.count)
				})
			}
		})
	}

	private _releaseTile(tile: TileRenderables, token: TileToken) {
		const featureIdKey = this.getProps('featureIdKey')
		tile.meshes.forEach((mesh) => {
			const meshFeatures = this._renderableFeatureMap.get(mesh)
			if (!meshFeatures) return

			meshFeatures.forEach((feature) => {
				const id = feature.properties[featureIdKey] as number | string

				// release feature range map
				this._featureIndexRangeMap.delete(feature)

				// delete indicators & indicatorsInfo map
				// NOTE: do not delete the entire IndicatorInfoList,
				// because all levels info are store in the same map with same id key
				const indicatorsInfos = this._idIndicatorRangeMap.get(id)
				if (indicatorsInfos) {
					indicatorsInfos.forEach((info) => {
						const { hoverIndicator, selectIndicator } = info
						if (tile.meshes.includes(hoverIndicator.gline)) {
							this._indicators.delete(hoverIndicator)
						}
						if (tile.meshes.includes(selectIndicator.gline)) {
							this._indicators.delete(selectIndicator)
						}
					})
				}
			})

			// delete renderableFeatures map
			this._renderableFeatureMap.delete(mesh)
		})
	}
}
