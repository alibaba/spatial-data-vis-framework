import { MeshDataType } from '@gs.i/schema-scene'
import { computeBBox, computeBSphere } from '@gs.i/utils-geometry'
import { XYZTileManager, TileRenderables, TileToken } from '@polaris.gl/utils-tile-manager'
import { RequestPending, XYZTileRequestManager } from '@polaris.gl/utils-request-manager'
import { PolarisGSI, StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'
import { Mesh, UnlitMaterial, Geom, Attr } from '@gs.i/frontend-sdk'
import { AbstractPolaris, CoordV2, CoordV3, PickInfo } from '@polaris.gl/base'
import Pbf from 'pbf'
import { decode } from 'geobuf'
import { Projection } from '@polaris.gl/projection'
import { colorToUint8Array } from '@polaris.gl/utils'

import { Color } from '@gs.i/utils-math'
import {
	featureToLinePositions,
	createRangeArray,
	getFeatureTriangles,
	RequireDefault,
	functionlize,
} from './utils'
import { LineIndicator } from '@polaris.gl/utils-indicator'
import { WorkerManager } from '@polaris.gl/utils-worker-manager'
import { createWorkers } from './workers/createWorkers'

/**
 * 配置项 interface
 */
export interface AOILayerProps extends StandardLayerProps {
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
	hoverLineLevel: 0 | 1 | 2 | 4

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
	selectLineLevel: 0 | 1 | 2 | 4

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

	/**
	 * Number of worker used, can be set to 0.
	 */
	workersNum?: number

	/**
	 * Enable debug mode: print errors, render boundingSphere
	 */
	debug?: boolean
}

/**
 * 配置项 默认值
 */
const defaultProps = {
	name: 'AOILayer',
	dataType: 'auto' as const,
	getUrl: (x, y, z) => {
		throw new Error('getUrl prop is not defined')
	},
	minZoom: 3,
	maxZoom: 20,
	featureIdKey: 'id' as const,
	baseAlt: 0,
	getColor: '#ffffff',
	getOpacity: 1.0,
	transparent: false,
	indicatorLinesHeight: 0,
	hoverLineLevel: 2 as const,
	hoverLineWidth: 1,
	hoverLineColor: '#333333',
	selectLineLevel: 2 as const,
	selectLineWidth: 2,
	selectLineColor: '#00ffff',
	framesBeforeRequest: 10,
	cacheSize: 512,
	viewZoomReduction: 0,
	useParentReplaceUpdate: true,
	workersNum: 0,
	debug: false,
}

defaultProps as AOILayerProps // this check the type but do not assign AOILayerProps to defaultProps

type IndicatorRangeInfo = {
	hoverIndicator: LineIndicator
	selectIndicator: LineIndicator
	ranges: { offset: number; count: number }[]
}

export class AOILayer extends StandardLayer<RequireDefault<AOILayerProps, typeof defaultProps>> {
	declare matr: UnlitMaterial

	declare requestManager: XYZTileRequestManager

	declare tileManager: XYZTileManager

	/**
	 * Performance info
	 */
	declare info: { times: Map<number | string, { reqTime: number; genTime: number }> }

	/**
	 * WorkerManager
	 */
	private declare _workerManager: WorkerManager

	/**
	 * For feature.index counter
	 * @NOTE this count will always increment even tiles may be released from memory, also means it will not decrease in any cases.
	 */
	private declare _featureCount: number

	/**
	 * Map for Mesh <-> Feature relations
	 */
	private declare _renderableFeatureMap: Map<MeshDataType, any[]>

	/**
	 * Map for Feature <-> GeomIndexRange in the current Mesh
	 * RangeType: [start, end]
	 */
	private declare _featureIndexRangeMap: Map<any, Uint8Array | Uint16Array | Uint32Array>

	/**
	 * LineIndicators list
	 */
	private declare _indicators: Set<LineIndicator>

	/**
	 * Map for hover/pick styles
	 */
	private declare _idIndicatorRangeMap: Map<number | string, IndicatorRangeInfo[]>

	/**
	 * Map for storing styled feature ids
	 * for setting styles among different tiles for the same geo
	 */
	private declare _hoveredIds: Set<number | string>

	private declare _selectedIds: Set<number | string>

	constructor(props: Partial<AOILayerProps> = {}) {
		const _props = {
			...defaultProps,
			...props,
		}
		super(_props)

		this.addEventListener('init', (e) => {
			this._init(e.projection, e.timeline, e.polaris)
		})
	}

	/**
	 * highlight api for TileLayers
	 */
	declare highlightByIds: (idsArr: number[], style: { [name: string]: any }) => void

	private _init(projection, timeline, polaris) {
		const p = polaris as AbstractPolaris

		if (!projection.isPlaneProjection) {
			throw new Error('AOILayer - TileLayer can only be used under plane projections')
		}

		this.listenProps(['workersNum'], () => {
			if (this._workerManager) {
				throw new Error('can not change props.workersNum')
			} else {
				const workersNum = this.getProp('workersNum')
				if (workersNum && workersNum > 0) {
					const workers: Worker[] = createWorkers(workersNum)
					this._workerManager = new WorkerManager(workers)
				}
			}
		})

		this.listenProps(
			[
				'debug',
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

				const dtConfig = this.getProp('dataType')
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

				const customFetcher = this.getProp('customFetcher')
				const customTileKeyGen = this.getProp('customTileKeyGen')
				this.requestManager =
					this.getProp('requestManager') ??
					new XYZTileRequestManager({
						dataType,
						fetcher: customFetcher ? ({ x, y, z }) => customFetcher(x, y, z) : undefined,
						getCacheKey: customTileKeyGen ? ({ x, y, z }) => customTileKeyGen(x, y, z) : undefined,
						getUrl: (requestArgs) => {
							return this.getProp('getUrl')(requestArgs.x, requestArgs.y, requestArgs.z)
						},
					})

				if (this.tileManager) {
					this.tileManager.dispose()
				}

				this.tileManager = new XYZTileManager({
					layer: this,
					minZoom: this.getProp('minZoom'),
					maxZoom: this.getProp('maxZoom'),
					cacheSize: this.getProp('cacheSize'),
					framesBeforeUpdate: this.getProp('framesBeforeRequest'),
					viewZoomReduction: this.getProp('viewZoomReduction'),
					useParentReplaceUpdate: this.getProp('useParentReplaceUpdate'),
					getTileRenderables: (tileToken) => {
						return this._createTileRenderables(tileToken, projection, polaris)
					},
					onTileRelease: (tile, token) => {
						this._releaseTile(tile, token)
					},
					printErrors: this.getProp('debug'),
				})

				this.tileManager.start()
			}
		)

		// update indicators' resolution uniform
		this.onViewChange = (cam) => {
			this._indicators.forEach((indicator) => {
				indicator.updateResolution(polaris.width, polaris.height)
			})
			// if (Math.abs(cam.pitch) > 0.0001) {
			// 	console.warn('AOILayer - AOILayer under 3D view mode is currently not supported')
			// }
		}

		/** highlight api */
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
		super.dispose()
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
		const dataType = this.getProp('dataType')
		const geojsonFilter = this.getProp('geojsonFilter')
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

					const filteredGeojson = geojsonFilter ? geojsonFilter(geojson) : undefined
					geojson = filteredGeojson ?? geojson

					if (
						!geojson.type ||
						geojson.type !== 'FeatureCollection' ||
						!geojson.features ||
						!Array.isArray(geojson.features)
					) {
						// console.warn(
						// 	`AOILayer - Tile source is not a valid GeoJSON, skip. Use 'geojsonFilter' to modify the response data if necessary. `
						// )
						resolve(emptyTile)
						return
					}

					if (geojson.features.length > 0) {
						this._createTileMesh(geojson, projection, polaris, cacheKey)
							.then((tile) => {
								if (time) {
									time.genTime = performance.now() - time.genTime
								}
								if (tile) {
									resolve(tile)
								}
							})
							.catch((e) => {
								reject(e)
							})
						return
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
		const transparent = this.getProp('transparent')
		const matr = new UnlitMaterial({
			alphaMode: transparent ? 'BLEND' : 'OPAQUE',
			baseColorFactor: { r: 1, g: 1, b: 1 },
		})

		matr.depthTest = this.getProp('depthTest')
		matr.vertGlobal = `attribute vec4 aColor;`
		matr.global = `varying vec4 vColor;`
		matr.vertOutput = `vColor = aColor / 255.0;`
		matr.fragOutput = `fragColor = vColor;`
		return matr
	}

	private async _createTileMesh(
		geojson: any,
		projection: Projection,
		polaris: AbstractPolaris,
		key?: string
	): Promise<TileRenderables | undefined> {
		if (!geojson.type || geojson.type !== 'FeatureCollection') {
			return
		}

		const mesh = new Mesh({
			name: key ? key : 'aois',
			extras: { isAOI: true },
		})
		mesh.renderOrder = this.getProp('renderOrder')

		// styles
		const featureIdKey = this.getProp('featureIdKey')
		const baseAlt = this.getProp('baseAlt')
		const featureFilter = this.getProp('featureFilter')
		const getColor = functionlize(this.getProp('getColor'))
		const getOpacity = functionlize(this.getProp('getOpacity'))
		const lineHeight = this.getProp('indicatorLinesHeight')
		const pickable = this.getProp('pickable')

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

		const features = geojson.features as any[]
		const loadPromises = features.map(async (feature) => {
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
				// polygon triangles generation
				// use workers if available

				const result = this._workerManager
					? await this._workerManager.execute({
							data: {
								task: 'getFeatureTriangles',
								feature,
								projectionDesc: projection.toDesc(),
								baseAlt,
							},
							transferables: [],
					  })
					: getFeatureTriangles(feature, projection, baseAlt)

				const { positions: featPositions, indices: featIndices } = result

				const indexStart = indices.length
				// const indexRange = new Uint32Array([indices.length, 0])
				// const colorRange = new Uint32Array([offset * 4, 0])

				for (let i = 0; i < featPositions.length; i += 3) {
					positions.push(featPositions[i + 0], featPositions[i + 1], featPositions[i + 2])
				}
				for (let i = 0; i < featIndices.length; i++) {
					indices.push(featIndices[i] + offset)
				}

				const count = featPositions.length / 3
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
				// use workers if available
				// const linePositions: Float32Array[] = this._workerManager
				// 	? (
				// 			await this._workerManager.execute({
				// 				data: {
				// 					task: 'featureToLinePositions',
				// 					feature,
				// 					projectionDesc: projection.toDesc(),
				// 					baseAlt: baseAlt + lineHeight,
				// 				},
				// 				transferables: [],
				// 			})
				// 	  ).linePositions
				// 	: featureToLinePositions(feature, projection, baseAlt + lineHeight)

				// outline positions generation
				const linePositions = featureToLinePositions(feature, projection, baseAlt + lineHeight)

				if (!linePositions) return

				for (let i = 0; i < linePositions.length; i++) {
					const linePos = linePositions[i]
					const count = linePos.length / 3
					const arr: number[] = []
					for (let j = 0, jl = linePos.length; j < jl; j += 3) {
						arr.push(linePos[j + 0], linePos[j + 1], linePos[j + 2])
					}
					linePosArr.push(arr)

					const range = {
						offset: linePosOffset,
						count,
					}

					const lineRanges = idLineRangeMap.get(id)
					if (lineRanges) {
						lineRanges.push(range)
					} else {
						idLineRangeMap.set(id, [range])
					}

					// update offset
					linePosOffset += count
				}
			}

			meshFeatures.push(feature)
		})

		const results = await Promise.all(loadPromises)

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

		// geom.boundingSphere = new Sphere(new Vector3(), Infinity)
		// geom.boundingBox = new Box3(
		// 	new Vector3(-Infinity, -Infinity, -Infinity),
		// 	new Vector3(Infinity, Infinity, Infinity)
		// )

		if (this.getProp('debug') && geom.boundingSphere) {
			console.warn('debug unimplemented')

			// TODO: gen wire frame is a GSI processor now
			// const wireframe = new Mesh({
			// 	name: 'bsphere-wireframe',
			// 	geometry: genBSphereWireframe(geom.boundingSphere),
			// 	// geometry: genBBoxWireframe(geom.boundingBox),
			// 	material: new UnlitMaterial({ baseColorFactor: { r: 1, g: 0, b: 1 } }),
			// })
			// mesh.add(wireframe)
		}

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
		const hoverLineWidth = this.getProp('hoverLineWidth') as number
		const hoverLineColor = this.getProp('hoverLineColor')
		const hoverLineLevel = this.getProp('hoverLineLevel')
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
			renderOrder: this.getProp('renderOrder'),
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
		const selectLineWidth = this.getProp('selectLineWidth') as number
		const selectLineColor = this.getProp('selectLineColor')
		const selectLineLevel = this.getProp('selectLineLevel')
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
			renderOrder: this.getProp('renderOrder'),
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

	// raycast(polaris: AbstractPolaris, canvasCoords: CoordV2, ndc: CoordV2): PickEvent | undefined {
	// 	if (!this.tileManager || !(polaris instanceof PolarisGSI)) return
	// 	const tiles = this.tileManager.getVisibleTiles()
	// 	for (let i = 0; i < tiles.length; i++) {
	// 		const tile = tiles[i]
	// 		const meshes = tile.meshes

	// 		const mesh = meshes.find((mesh) => mesh.extras && mesh.extras.isAOI)
	// 		if (!mesh) continue

	// 		const pickResult = polaris.pickObject(mesh, ndc)
	// 		if (pickResult.hit && pickResult.intersections && pickResult.intersections.length > 0) {
	// 			const intersection = pickResult.intersections[0]
	// 			const index = intersection.index
	// 			const features = this._renderableFeatureMap.get(mesh)
	// 			if (index === undefined || !features) return

	// 			// find the hit feature by feature indexRange
	// 			let hitFeature
	// 			const indexTri = index * 3
	// 			for (let j = 0; j < features.length; j++) {
	// 				const feature = features[j]
	// 				const indexRange = this._featureIndexRangeMap.get(feature)
	// 				if (indexRange && indexTri >= indexRange[0] && indexTri <= indexRange[1]) {
	// 					hitFeature = feature
	// 					break
	// 				}
	// 			}

	// 			if (!hitFeature) return

	// 			const event: PickEvent = {
	// 				distance: intersection.distance ?? 0,
	// 				index: hitFeature.index,
	// 				point: intersection.point as CoordV3,
	// 				pointLocal: intersection.pointLocal as CoordV3,
	// 				object: mesh,
	// 				data: {
	// 					feature: hitFeature,
	// 					curr: hitFeature, // backward compatibility
	// 				},
	// 			}
	// 			return event
	// 		}
	// 	}

	// 	return
	// }

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
		const featureIdKey = this.getProp('featureIdKey')
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
