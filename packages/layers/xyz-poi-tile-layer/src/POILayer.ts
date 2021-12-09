import { isDISPOSED } from '@gs.i/schema'
import { XYZTileManager, TileRenderables } from '@polaris.gl/utils-tile-manager'
import { Marker } from '@polaris.gl/layer-std-marker'
import { XYZTileRequestManager } from '@polaris.gl/utils-request-manager'
import { STDLayer, STDLayerProps } from '@polaris.gl/layer-std'
import { Mesh, MatrPoint, Geom, Attr } from '@gs.i/frontend-sdk'
import { Base, CoordV2, PickEvent, Polaris } from '@polaris.gl/schema'
import Pbf from 'pbf'
import { decode } from 'geobuf'
import { Projection } from '@polaris.gl/projection'
import { colorToUint8Array, PointsMeshPickHelper } from '@polaris.gl/utils'
import { PolarisGSI } from '@polaris.gl/gsi'
import { Color } from '@gs.i/utils-math'

/**
 * 配置项 interface
 */
export interface POILayerProps extends STDLayerProps {
	/**
	 * Tile response data type,
	 * not essential if the 'requestManager' prop has been set
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
	 * The id prop key in feature.properties is essential for XYZ tiles,
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
	 * POI image url
	 */
	pointImage: string

	/**
	 * point size (px)
	 */
	pointSize: number

	/**
	 * point hover size (px)
	 */
	pointHoverSize: number

	/**
	 * The point image is rendered at center of lnglat location by default,
	 * setting offsets can let the point image be rendered at position [size * offset],
	 * usually both numbers are between [-1.0, 1.0], but not necessary.
	 */
	pointOffset: [number, number]

	/**
	 * cluster size (px)
	 */
	clusterSize: number

	/**
	 * Get poi color
	 */
	getPointColor: number | string | ((feature: any) => number | string)

	/**
	 * Get clustered poi image
	 */
	getClusterImage: string | ((feature: any) => string)

	/**
	 * cluster dom style
	 */
	clusterDOMStyle: any

	/**
	 * Get cluster feature count
	 * @return => {number} to set this feature as a cluster, the number will be rendered onto marker
	 * @return => {undefined} to set this feature as non-clusted point, it will be rendered as normal point
	 */
	getClusterCount: (feature: any) => number | undefined

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
	stableFramesBeforeRequest?: number

	/**
	 * The limit of tile cache count
	 * default is 512
	 */
	cacheSize?: number

	/**
	 * User customized fetch method to replace the default layer fetcher
	 * If this prop has been set, the 'getUrl' props will be ignored
	 */
	customFetcher?: (x: number, y: number, z: number) => Promise<any>

	/**
	 * User customized fetch cache key generator
	 */
	customTileKeyGen?: (x: number, y: number, z: number) => string
}

/**
 * 配置项 默认值
 */
export const defaultProps: POILayerProps = {
	dataType: 'auto',
	getUrl: (x, y, z) => {
		throw new Error('getUrl prop is not defined')
	},
	minZoom: 3,
	maxZoom: 20,
	featureIdKey: 'id',
	baseAlt: 0,
	pointImage:
		'https://img.alicdn.com/imgextra/i3/O1CN01naDbsE1HeeoOqvic6_!!6000000000783-2-tps-256-256.png',
	getPointColor: '#ffafff',
	pointSize: 16,
	pointHoverSize: 32,
	pointOffset: [0.0, 0.0],
	getClusterImage:
		'https://img.alicdn.com/imgextra/i1/O1CN01yyOfXC23ffGrhohq7_!!6000000007283-2-tps-53-52.png',
	clusterSize: 64,
	clusterDOMStyle: {},
	getClusterCount: (feature) => undefined,
	stableFramesBeforeRequest: 5,
	cacheSize: 512,
}

export class POILayer extends STDLayer {
	matr: MatrPoint
	// geoMap: Map<string, any>

	requestManager: XYZTileRequestManager

	tileManager: XYZTileManager

	private _featureCount: number

	/**
	 * Element for point picking test
	 */
	private _pointImgElem: HTMLImageElement

	/**
	 * Map for storing Mesh/Marker <-> Feature relations
	 */
	private _renderableFeatureMap: Map<Mesh | Marker, any>

	/**
	 * 'index' is unique for every feature in tiles
	 * even if there are features stands for the same geo
	 * they will be assigned different index
	 */
	private _indexMeshMap: Map<number, { obj: Mesh | Marker; objIdx: number }>

	/**
	 * 'id' property is unique for every valid geo feature in tiles
	 * there may be some features with the same id value in different z levels
	 * because they are the same geo in real world
	 * so the map will store id <-> Meshes(Markers) for further usage
	 */
	private _idMeshesMap: Map<number | string, { obj: Mesh | Marker; objIdx: number }[]>

	/**
	 * Map for storing styled feature ids
	 * for setting styles among different tiles for the same geo poi
	 */
	private _idStyleMap: Map<number | string, { [name: string]: any }>

	constructor(props: Partial<POILayerProps> = {}) {
		const _props = {
			...defaultProps,
			...props,
		}
		super(_props)
		this.name = this.group.name = 'POILayer'
	}

	/**
	 * highlight api for TileLayers
	 */
	highlightByIds: (idsArr: number[], style: { [name: string]: any }) => void

	init(projection, timeline, polaris) {
		const p = polaris as Polaris

		if (!projection.isPlaneProjection) {
			throw new Error('POILayer - TileLayer can only be used in plane projections')
		}

		this.listenProps(
			[
				'getUrl',
				'dataType',
				'minZoom',
				'maxZoom',
				'featureIdKey',
				'baseAlt',
				'pointImage',
				'getPointColor',
				'getClusterImage',
				'clusterStyle',
				'pointSize',
				'clusterSize',
				'featureFilter',
				'getClusterCount',
				'requestManager',
				'pointOffset',
				'geojsonFilter',
				'stableFramesBeforeRequest',
				'customFetcher',
				'customTileKeyGen',
				'cacheSize',
			],
			() => {
				this._featureCount = 0

				this._renderableFeatureMap = new Map()

				this._indexMeshMap = new Map()

				this._idMeshesMap = new Map()

				this._idStyleMap = new Map()

				this._createPointImgElement()

				this.matr = this._createPointMatr(polaris)

				if (this.requestManager) {
					console.error('Cannot change/modify RequestManager in runtime! ')
					return
				}

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

				this.tileManager = new XYZTileManager({
					layer: this,
					minZoom: this.getProps('minZoom'),
					maxZoom: this.getProps('maxZoom'),
					cacheSize: this.getProps('cacheSize'),
					stableFramesBeforeUpdate: this.getProps('stableFramesBeforeRequest'),
					getTileRenderables: (tileToken) => {
						return this._createTileRenderables(tileToken, projection, polaris)
					},
				})

				this.tileManager.start()
			}
		)

		this.onViewChange = (cam, p) => {
			const polaris = p as Polaris
			if (this.matr) {
				this.matr.uniforms.uResolution.value = { x: polaris.width, y: polaris.height }
			}
		}

		/** picking */
		this.onHover = this._pickPOI
		this.onClick = this._pickPOI

		/** highlight api */
		this.highlightByIndices = (dataIndexArr: number[], style: { [name: string]: any }) => {
			console.error(
				'POILayer - This method is not implemented, please use .highlightByIds() instead. '
			)
			// if (!this._indexMeshMap) return
			// if (!style || !style.type) return
			// const type = style.type
			// const pointSize = this.getProps('pointSize')
			// const pointHoverSize = this.getProps('pointHoverSize')
			// dataIndexArr.forEach((index) => {
			// 	const idxInfo = this._indexMeshMap.get(index)
			// 	if (!idxInfo) return
			// 	const obj = idxInfo.obj
			// 	const objIdx = idxInfo.objIdx
			// 	if (obj instanceof Marker) {
			// 		return
			// 	} else if (obj instanceof Mesh) {
			// 		if (type === 'none') {
			// 			this._updatePointSizeByIndex(obj, objIdx, pointSize)
			// 		} else if (type === 'hover') {
			// 			this._updatePointSizeByIndex(obj, objIdx, pointHoverSize)
			// 		}
			// 	}
			// })
		}

		/** highlight api 2 */
		this.highlightByIds = (idsArr: (number | string)[], style: { [name: string]: any }) => {
			if (!this._idMeshesMap) return
			if (!style || !style.type) return

			const type = style.type
			const pointSize = this.getProps('pointSize')
			const pointHoverSize = this.getProps('pointHoverSize')
			idsArr.forEach((id) => {
				const meshInfos = this._idMeshesMap.get(id)
				if (!meshInfos) return
				meshInfos.forEach((meshInfo) => {
					const obj = meshInfo.obj
					const objIdx = meshInfo.objIdx
					if (obj instanceof Marker) {
						/** @TODO react on marker highlight */
						return
					} else if (obj instanceof Mesh) {
						if (type === 'none') {
							this._updatePointSizeByIndex(obj, objIdx, pointSize)
							this._idStyleMap.delete(id)
						} else if (type === 'hover') {
							this._updatePointSizeByIndex(obj, objIdx, pointHoverSize)
							this._idStyleMap.set(id, { ...style })
						}
					}
				})
			})
		}
	}

	dispose() {
		this._featureCount = 0
		this._pointImgElem = new Image()
		this._renderableFeatureMap = new Map()
		this._indexMeshMap = new Map()
		this._idMeshesMap = new Map()
		this._idStyleMap = new Map()
		this.requestManager.dispose()
		this.tileManager.dispose()
	}

	getLoadingState() {}

	private _createPointImgElement() {
		this._pointImgElem = new Image()
		this._pointImgElem.setAttribute('crossOrigin', 'anonymous')
		this._pointImgElem.src = this.getProps('pointImage')
	}

	private _createTileRenderables(token, projection, polaris) {
		const dataType = this.getProps('dataType')
		const geojsonFilter = this.getProps('geojsonFilter')
		const x = token[0],
			y = token[1],
			z = token[2]

		const req = this.requestManager.request({ x, y, z })
		const cacheKey = this._getCacheKey(x, y, z)

		return new Promise<TileRenderables>((resolve, reject) => {
			req
				.then((data) => {
					let geojson: any

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
						reject()
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
							`POILayer - Tile source is not a valid GeoJSON, skip. Use 'geojsonFilter' to modify the response data if necessary. `
						)
						reject()
						return
					}

					if (geojson.features.length > 0) {
						const tile = this._createTileMeshAndMarkers(geojson, projection, polaris, cacheKey)
						if (tile) {
							resolve(tile)
							return
						}
					}

					resolve({
						meshes: [],
						layers: [],
					})
				})
				.catch((e) => {
					reject(e)
				})
		})
	}

	private _createPointMatr(polaris: Polaris) {
		const pointOffset = this.getProps('pointOffset')
		const matr = new MatrPoint({
			alphaMode: 'BLEND',
			depthTest: this.getProps('depthTest'),
			size: this.getProps('pointSize'),
			baseColorFactor: { r: 1, g: 1, b: 1 },
			baseColorTexture: {
				image: { uri: this.getProps('pointImage'), flipY: true },
				sampler: {
					minFilter: 'LINEAR_MIPMAP_LINEAR',
					magFilter: 'LINEAR',
					wrapS: 'CLAMP_TO_EDGE',
					wrapT: 'CLAMP_TO_EDGE',
					anisotropy: 1,
				},
			},
			uniforms: {
				uOffset: {
					type: 'vec2',
					value: { x: pointOffset[0], y: pointOffset[1] },
				},
				uResolution: {
					type: 'vec2',
					value: { x: polaris.width, y: polaris.height },
				},
			},
			attributes: {
				aSize: 'float',
				aColor: 'vec3',
			},
			varyings: {
				vColor: 'vec3',
			},
			vertPointSize: `
				pointSize = aSize;
			`,
			vertOutput: `
				vColor = aColor / 255.0;
				glPosition = projectionMatrix * modelViewPosition;
				glPosition /= glPosition.w;
				vec2 pxRange = vec2(aSize) / uResolution;
				vec2 offset = uOffset;
				glPosition.xy += offset * pxRange;
			`,
			fragColor: `
				fragColor.rgb = vColor;
			`,
		})
		return matr
	}

	private _createTileMeshAndMarkers(
		geojson: any,
		projection: Projection,
		polaris: Polaris,
		key?: string
	): TileRenderables | undefined {
		if (!geojson.type || geojson.type !== 'FeatureCollection') {
			return
		}

		const featureIdKey = this.getProps('featureIdKey')
		const baseAlt = this.getProps('baseAlt')
		const featureFilter = this.getProps('featureFilter')
		const getClusterCount = this.getProps('getClusterCount')
		const clusterSize = this.getProps('clusterSize')
		const getPointColor = this.getProps('getPointColor')
		const getClusterImage = this.getProps('getClusterImage')
		const pointOffset = this.getProps('pointOffset')
		const renderOrder = this.getProps('renderOrder')

		const mesh = new Mesh({
			name: key ? key : 'pois',
			renderOrder,
		})

		const layers: Marker[] = []
		const meshes: Mesh[] = []
		const meshFeatures: any[] = []

		const positions: number[] = []
		const sizes: number[] = []
		const colors: number[] = []
		let pointsIndex = 0
		geojson.features.forEach((feature) => {
			if (!feature.geometry || feature.geometry.type !== 'Point') {
				return
			}

			// apply filter
			if (featureFilter) {
				const filterResult = featureFilter(feature)
				if (filterResult === undefined || filterResult === false) {
					return
				}
			}

			const id = feature.properties[featureIdKey] as number | string

			// add 'index' prop to feature
			feature.index = this._featureCount
			this._featureCount++

			const coords = feature.geometry.coordinates as number[]
			const clusterNum = getClusterCount(feature)
			if (clusterNum !== undefined && clusterNum !== null) {
				// cluster point
				const div = this._createClusterDiv(clusterNum, getClusterImage(feature))
				const cluster = new Marker({
					lng: coords[0],
					lat: coords[1],
					alt: (coords[2] ?? 0) + baseAlt,
					html: div,
					offsetX: -0.5 * clusterSize,
					offsetY: -0.5 * clusterSize,
					renderOrder,
				})
				layers.push(cluster)

				this._renderableFeatureMap.set(cluster, feature)
				const meshInfo = { obj: cluster, objIdx: 0 }
				this._setIndexMeshMap(feature.index, meshInfo)
				this._setIdMeshesMap(id, meshInfo)
			} else {
				// check id key
				if (id === undefined || id === null) {
					console.error(
						`feature does not have featureIdKey: ${featureIdKey}, please check tile data or layer config`
					)
					return
				}

				// non-cluster point
				const xyz = projection.project(coords[0], coords[1], (coords[2] ?? 0) + baseAlt)
				const color = getPointColor(feature)
				const colorUint8 = colorToUint8Array(new Color(color))
				const styledSize = this._getPointStyledSize(this._idStyleMap.get(id))
				positions.push(...xyz)
				sizes.push(styledSize)
				colors.push(...colorUint8)

				const meshInfo = {
					obj: mesh,
					objIdx: pointsIndex,
				}
				this._setIndexMeshMap(feature.index, meshInfo)
				this._setIdMeshesMap(id, meshInfo)
				meshFeatures.push(feature)

				pointsIndex++
			}
		})

		const posAttr = new Attr(new Float32Array(positions), 3)
		const sizeAttr = new Attr(new Uint16Array(sizes), 1, false, 'DYNAMIC_DRAW')
		const colorAttr = new Attr(new Uint8Array(colors), 3)
		const geom = new Geom({
			mode: 'POINTS',
			attributes: {
				position: posAttr,
				aSize: sizeAttr,
				aColor: colorAttr,
			},
		})

		mesh.geometry = geom
		mesh.material = this.matr
		mesh.extras.pickHelper = new PointsMeshPickHelper(
			mesh,
			this._pointImgElem,
			polaris,
			'aSize',
			pointOffset
		)
		meshes.push(mesh)
		this._renderableFeatureMap.set(mesh, meshFeatures)

		return { meshes, layers }
	}

	private _createClusterDiv(text: string, img: string) {
		const size = this.getProps('clusterSize')
		const clusterDOMStyle = this.getProps('clusterDOMStyle')

		const pxSize = size
		const div = document.createElement('div')
		div.innerText = text

		const style = div.style as any
		for (const key in clusterDOMStyle) {
			if (Object.prototype.hasOwnProperty.call(clusterDOMStyle, key)) {
				const value = clusterDOMStyle[key]
				style[key] = value
			}
		}

		style.textAlign = 'center'
		style.lineHeight = pxSize + 'px'
		style.width = pxSize + 'px'
		style.height = pxSize + 'px'
		style.background = `url(${img})`
		// style.backgroundColor = '#ff00ff'
		// style.backgroundBlendMode = 'multiply'
		style.backgroundPosition = 'center'
		style.backgroundSize = pxSize + 'px'
		// style.filter = 'opacity(.5) drop-shadow(0 0 0 yellow)'
		// style.maskImage = `url(${img})`
		// style.maskMode = 'alpha'
		// style.mask = `url(${img})`
		// style.maskMode = 'alpha'

		return div
	}

	private _getCacheKey(x: number | string, y: number | string, z: number | string) {
		return `${x}|${y}|${z}`
	}

	private _pickPOI(polaris: Base, canvasCoords: CoordV2, ndc: CoordV2): PickEvent | undefined {
		if (!this.tileManager || !(polaris instanceof PolarisGSI)) return

		const markers: Marker[] = []
		const meshes: Mesh[] = []

		const renderableList = this.tileManager.getVisibleTiles()
		renderableList.forEach((r) => markers.push(...(r.layers as Marker[])))
		renderableList.forEach((r) => meshes.push(...(r.meshes as Mesh[])))

		// pick markers
		for (let i = 0; i < markers.length; i++) {
			const marker = markers[i]
			const pickResult = marker.pick(polaris, canvasCoords, ndc)
			if (pickResult) {
				const feature = this._renderableFeatureMap.get(marker)
				pickResult.index = feature.index
				pickResult.data = {
					type: 'cluster',
					curr: feature,
				}
				return pickResult
			}
		}

		// pick points
		for (let i = 0; i < meshes.length; i++) {
			const mesh = meshes[i]
			if (!mesh.extras) continue
			const pickHelper = mesh.extras.pickHelper as PointsMeshPickHelper
			const pickResult = pickHelper.pick(polaris, canvasCoords)
			if (pickResult) {
				const features = this._renderableFeatureMap.get(mesh)
				const feature = features[pickResult.index]
				pickResult.index = feature.index
				pickResult.data = {
					type: 'point',
					feature,
					curr: feature, // backward compatibility
				}
				return pickResult
			}
		}
	}

	private _updatePointSizeByIndex(mesh: Mesh, index: number, size: number) {
		const attr = mesh.geometry?.attributes.aSize
		if (!attr) return
		const array = attr.array
		if (isDISPOSED(array)) return
		array[index] = size
		attr.updateRanges = attr.updateRanges || []
		attr.updateRanges.push({
			start: index,
			count: 1,
		})
		attr.version++
	}

	private _setIdMeshesMap(id: number | string, obj: any) {
		if (id === undefined || id === null) {
			// cluster may not have ids
			return
		}
		if (this._idMeshesMap.has(id)) {
			this._idMeshesMap.get(id)?.push(obj)
		} else {
			this._idMeshesMap.set(id, [obj])
		}
	}

	private _setIndexMeshMap(index: number, obj: any) {
		this._indexMeshMap.set(index, obj)
	}

	private _getPointStyledSize(style?: { [name: string]: any }): number {
		const pointSize = this.getProps('pointSize')
		const pointHoverSize = this.getProps('pointHoverSize')
		if (!style || !style.type) {
			return pointSize
		}
		const type = style.type as string
		if (type === 'none') {
			return pointSize
		}
		if (type === 'hover') {
			return pointHoverSize
		}
		return pointSize
	}
}
