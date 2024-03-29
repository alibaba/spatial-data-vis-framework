import { specifyTexture } from '@gs.i/utils-specify'
import { isDISPOSED } from '@gs.i/schema-scene'
import { Mesh, PointMaterial, Geom, Attr } from '@gs.i/frontend-sdk'
import { Color } from '@gs.i/utils-math'
import {
	XYZTileManager,
	TileRenderables,
	TilePromise,
	TileToken,
} from '@polaris.gl/utils-tile-manager'
import { Marker } from '@polaris.gl/layer-std-marker'
import { RequestPending, XYZTileRequestManager } from '@polaris.gl/utils-request-manager'
import { AbstractPolaris, CoordV2, PickInfo } from '@polaris.gl/base'
import { Projection } from '@polaris.gl/projection'
import { colorToUint8Array, brushColorToImage } from '@polaris.gl/utils'
import { PointsMeshPickHelper } from './helpers'
import { PolarisGSI, StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'
import Pbf from 'pbf'
import { decode } from 'geobuf'
import { functionlize, RequireDefault } from './utils'

/**
 * 配置项 interface
 */
export interface POILayerProps extends StandardLayerProps {
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
	 * Get poi color
	 */
	getPointColor: number | string | ((feature: any) => number | string)

	/**
	 * color blend mode
	 *
	 * @option 'replace' -> targetRGB = sourceRGB
	 * @option 'multiply' -> targetRGB = rawRGB * sourceRGB
	 * @option 'add' -> targetRGB = rawRGB + sourceRGB
	 *
	 * all blend methods will keep the raw alpha values of source image.
	 */
	pointColorBlend: 'replace' | 'multiply' | 'add'

	/**
	 * point size (px)
	 * @NOTE Value cannot be larger than WebGL limitation 'Aliased Point Size Range'
	 * @link https://webglreport.com/
	 */
	pointSize: number

	/**
	 * point hover size (px)
	 * @NOTE Value cannot be larger than WebGL limitation 'Aliased Point Size Range'
	 * @link https://webglreport.com/
	 */
	pointHoverSize: number

	/**
	 * The point image is rendered at center of lnglat location by default,
	 * setting offsets can let the point image be rendered at position [size * offset],
	 * usually both numbers are between [-1.0, 1.0], but not necessary.
	 * @NOTE bottom/left values should be < 0, top/right values should be > 0.
	 */
	pointOffset: readonly [number, number]

	/**
	 * cluster size (px)
	 */
	clusterSize: number

	/**
	 * cluster point image
	 */
	clusterImage: string

	/**
	 * same with pointColor
	 */
	clusterColor: number | string

	/**
	 * same with 'pointColorBlend'
	 */
	clusterColorBlend: 'replace' | 'multiply' | 'add'

	/**
	 * TODO: @qianxun describe this
	 */
	clusterStyle?

	/**
	 * Get cluster feature text string
	 * @return => {string} to set this feature as a cluster, the content will be rendered onto marker
	 * @return => {undefined} to set this feature as non-clustered point, it will be rendered as normal point
	 */
	getClusterContent: (feature: any) => string | undefined

	/**
	 * cluster dom style
	 */
	getClusterDOMStyle?: { [key: string]: any } | ((feature: any) => { [key: string]: any })

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
export const defaultProps = {
	name: 'POILayer',
	dataType: 'auto' as const,
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
	pointColorBlend: 'replace' as const,
	pointSize: 16,
	pointHoverSize: 32,
	pointOffset: [0.0, 0.0] as const,
	clusterImage:
		'https://img.alicdn.com/imgextra/i2/O1CN016yGVRh1Tdzf8SkuLn_!!6000000002406-2-tps-60-60.png',
	clusterColor: '#00afff',
	clusterColorBlend: 'replace' as const,
	clusterSize: 64,
	getClusterDOMStyle: {},
	getClusterContent: (feature) => undefined,
	framesBeforeRequest: 10,
	cacheSize: 512,
	viewZoomReduction: 0,
	useParentReplaceUpdate: true,
}

defaultProps as POILayerProps

export class POILayer extends StandardLayer<RequireDefault<POILayerProps, typeof defaultProps>> {
	declare matr: PointMaterial

	declare requestManager: XYZTileRequestManager

	declare tileManager: XYZTileManager

	private _ratio: number

	private declare _featureCount: number

	/**
	 * Element for point picking test
	 */
	private declare _pointImgElem: HTMLImageElement

	/**
	 * cache
	 */
	private declare _clusterImgUrl: string

	/**
	 * Map for storing Mesh/Marker <-> Feature relations
	 */
	private declare _renderableFeatureMap: Map<Mesh | Marker, any>

	/**
	 * 'index' is unique for every feature in tiles
	 * even if there are features stands for the same geo
	 * they will be assigned different index
	 */
	private declare _indexMeshMap: Map<number, { obj: Mesh | Marker; objIdx: number }>

	/**
	 * 'id' property is unique for every valid geo feature in tiles
	 * there may be some features with the same id value in different z levels
	 * because they are the same geo in real world
	 * so the map will store id <-> Meshes(Markers) for further usage
	 */
	private declare _idMeshesMap: Map<number | string, { obj: Mesh | Marker; objIdx: number }[]>

	/**
	 * Map for storing styled feature ids
	 * for setting styles among different tiles for the same geo poi
	 */
	private declare _idStyleMap: Map<number | string, { [name: string]: any }>

	constructor(props: Partial<POILayerProps> = {}) {
		const _props = {
			...defaultProps,
			...props,
		}
		super(_props)
		this._ratio = 1.0

		this.addEventListener('init', (e) => {
			this._init(e.projection, e.timeline, e.polaris)
		})
	}

	/**
	 * highlight api for TileLayers
	 */
	declare highlightByIds: (idsArr: number[], style: { [name: string]: any }) => void

	_init(projection, timeline, polaris) {
		const p = polaris as PolarisGSI

		if (!projection.isPlaneProjection) {
			throw new Error('POILayer - TileLayer can only be used under plane projections')
		}

		// cache polaris render ratio for pointSizes computation
		this._ratio = polaris.ratio ?? 1.0

		this.listenProps(
			[
				'getUrl',
				'dataType',
				'minZoom',
				'maxZoom',
				'featureIdKey',
				'baseAlt',
				'pointImage',
				'pointSize',
				'pointHoverSize',
				'getPointColor',
				'pointColorBlend',
				'clusterImage',
				'clusterColor',
				'clusterColorBlend',
				'clusterStyle',
				'clusterSize',
				'featureFilter',
				'getClusterContent',
				'requestManager',
				'pointOffset',
				'geojsonFilter',
				'framesBeforeRequest',
				'customFetcher',
				'customTileKeyGen',
				'cacheSize',
				'viewZoomReduction',
				'useParentReplaceUpdate',
			],
			() => {
				this._checkProps(p)

				this._featureCount = 0

				this._renderableFeatureMap = new Map()

				this._indexMeshMap = new Map()

				this._idMeshesMap = new Map()

				this._idStyleMap = new Map()

				this._createPointImgElement()

				this.matr = this._createPointMatr(polaris)

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

		this.onViewChange = (cam, p) => {
			const polaris = p as AbstractPolaris
			this._ratio = polaris.ratio ?? 1.0
			if (this.matr) {
				// @note matr.uniform is currently a setter. can not read from it
				// this.matr.uniforms.uResolution.value = { x: polaris.canvasWidth, y: polaris.canvasHeight }
			}
			// if (Math.abs(cam.pitch) > 0.0001) {
			// 	console.warn('POILayer - POILayer under 3D view mode is currently not supported')
			// }
		}

		/** highlight api */
		// this.highlightByIndices = undefined

		/** highlight api 2 */
		this.highlightByIds = (idsArr: (number | string)[], style: { [name: string]: any }) => {
			if (!this._idMeshesMap) return
			if (!style || !style.type) return

			const type = style.type
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
							this._updatePointSizeByIndex(obj, objIdx, this._getPointStyledSize(style))
							this._idStyleMap.delete(id)
						} else if (type === 'hover') {
							this._updatePointSizeByIndex(obj, objIdx, this._getPointStyledSize(style))
							this._idStyleMap.set(id, { ...style })
						}
					}
				})
			})
		}
	}

	dispose() {
		super.dispose()
		this._featureCount = 0
		this._pointImgElem = new Image()
		this._renderableFeatureMap = new Map()
		this._indexMeshMap = new Map()
		this._idMeshesMap = new Map()
		this._idStyleMap = new Map()
		this.requestManager.dispose()
		this.tileManager.dispose()
	}

	getState() {
		const pendsCount = this.tileManager ? this.tileManager.getPendsCount() : undefined
		return {
			pendsCount,
		}
	}

	private _checkProps(polaris: PolarisGSI) {
		const pointSize = this.getProps('pointSize') * this._ratio
		const pointHoverSize = this.getProps('pointHoverSize') * this._ratio
		const capabilities = polaris.renderer.getCapabilities()
		const maxSize = capabilities.pointSizeRange[1]
		if (pointSize > maxSize || pointHoverSize > maxSize) {
			console.error(
				'POILayer - The pointSize/pointHoverSize reaches context limit: ' +
					maxSize +
					', points may be rendered up to this limit. '
			)
		}
	}

	private _createPointImgElement() {
		this._pointImgElem = new Image()
		this._pointImgElem.setAttribute('crossOrigin', 'anonymous')
		this._pointImgElem.src = this.getProps('pointImage')
	}

	private _createTileRenderables(token, projection, polaris): TilePromise {
		const dataType = this.getProps('dataType')
		const geojsonFilter = this.getProps('geojsonFilter')
		const x = token[0],
			y = token[1],
			z = token[2]

		const requestPending = this.requestManager.request({ x, y, z })
		const requestPromise = requestPending.promise
		const cacheKey = this._getCacheKey(x, y, z)

		const promise = new Promise<TileRenderables>((resolve, reject) => {
			requestPromise
				.then(async (data) => {
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
						// 	`POILayer - Tile source is not a valid GeoJSON, skip. Use 'geojsonFilter' to modify the response data if necessary. `
						// )
						resolve(emptyTile)
						return
					}

					if (geojson.features.length > 0) {
						const clusterImage = await this._getClusterImage()
						const tile = this._createTileMeshAndMarkers(
							geojson,
							projection,
							polaris,
							cacheKey,
							clusterImage
						)
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

	private _createPointMatr(polaris: AbstractPolaris) {
		const pointOffset = this.getProps('pointOffset')
		const pointColorBlend = this.getProps('pointColorBlend')
		let P_COLOR_MODE = 0
		switch (pointColorBlend) {
			case 'replace':
				P_COLOR_MODE = 0
				break
			case 'multiply':
				P_COLOR_MODE = 1
				break
			case 'add':
				P_COLOR_MODE = 2
				break
		}

		const matr = new PointMaterial({
			alphaMode: 'BLEND',
			depthTest: this.getProps('depthTest'),
			baseColorFactor: { r: 1, g: 1, b: 1 },
			baseColorTexture: specifyTexture({
				image: { uri: this.getProps('pointImage'), extensions: { EXT_image: { flipY: true } } },
				sampler: {
					minFilter: 'LINEAR_MIPMAP_LINEAR',
					magFilter: 'LINEAR',
					wrapS: 'CLAMP_TO_EDGE',
					wrapT: 'CLAMP_TO_EDGE',
				},
			}),
			defines: {
				P_COLOR_MODE,
			},
			uniforms: {
				uOffset: {
					value: { x: pointOffset[0], y: pointOffset[1] },
				},
				uResolution: {
					value: { x: polaris.canvasWidth, y: polaris.canvasHeight },
				},
			},
			global: `
				uniform vec2 uOffset;
				uniform vec2 uResolution;

				varying vec3 vColor;
			`,
			vertGlobal: `
				attribute float aSize;
				attribute vec3 aColor;
			`,
			vertPointGeometry: `
				pointSize = aSize;
			`,
			vertOutput: `
				vColor = aColor / 255.0;
				// calc point offsets
				vec2 sizes = vec2(aSize);
				glPosition = projectionMatrix * modelViewPosition;
				glPosition /= glPosition.w;
				vec2 pxRange = sizes / uResolution;
				vec2 offset = uOffset;
				glPosition.xy += offset * pxRange;
			`,
			fragOutput: `
			#if P_COLOR_MODE == 0          // replace
				fragColor.rgb = vColor;
			#elif P_COLOR_MODE == 1        // multiply
				fragColor.rgb *= vColor;
			#elif P_COLOR_MODE == 2        // add
				fragColor.rgb += vColor;
			#endif
			`,
		})
		return matr
	}

	private _createTileMeshAndMarkers(
		geojson: any,
		projection: Projection,
		polaris: AbstractPolaris,
		key: string,
		clusterImage: string
	): TileRenderables | undefined {
		if (!geojson.type || geojson.type !== 'FeatureCollection') {
			return
		}

		const featureIdKey = this.getProps('featureIdKey')
		const baseAlt = this.getProps('baseAlt')
		const featureFilter = this.getProps('featureFilter')
		const getClusterContent = this.getProps('getClusterContent')
		const clusterSize = this.getProps('clusterSize')
		const getPointColor = functionlize(this.getProps('getPointColor'))
		const pointOffset = this.getProps('pointOffset')
		const renderOrder = this.getProps('renderOrder')

		const mesh = new Mesh({
			name: key ? key : 'pois',
		})

		mesh.renderOrder = renderOrder

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
			const clusterContent = getClusterContent(feature) as string
			if (clusterContent !== undefined) {
				// cluster point
				const div = this._createClusterDiv(clusterContent, clusterImage, feature)
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

	private async _getClusterImage() {
		if (this._clusterImgUrl) return this._clusterImgUrl

		this._clusterImgUrl = await brushColorToImage(
			this.getProps('clusterImage'),
			this.getProps('clusterColor'),
			this.getProps('clusterSize'),
			this.getProps('clusterSize'),
			this.getProps('clusterColorBlend')
		)

		return this._clusterImgUrl
	}

	private _createClusterDiv(text: string, clusterImage: string, feature: any) {
		const clusterSize = this.getProps('clusterSize')

		const div = document.createElement('div')
		div.innerText = text

		const style = div.style as any
		const getClusterDOMStyle = this.getProps('getClusterDOMStyle')
		if (getClusterDOMStyle) {
			let customStyle: { [key: string]: any }
			if (typeof getClusterDOMStyle === 'function') {
				customStyle = getClusterDOMStyle(feature)
			} else {
				customStyle = getClusterDOMStyle
			}
			for (const key in customStyle) {
				if (Object.prototype.hasOwnProperty.call(customStyle, key)) {
					const value = customStyle[key]
					style[key] = value
				}
			}
		}

		style.textAlign = 'center'
		style.lineHeight = clusterSize + 'px'
		style.width = clusterSize + 'px'
		style.height = clusterSize + 'px'
		style.backgroundPosition = 'center'
		style.backgroundSize = clusterSize + 'px'
		style.background = `url(${clusterImage})`
		// style.background = `url(https://img.alicdn.com/imgextra/i2/O1CN016yGVRh1Tdzf8SkuLn_!!6000000002406-2-tps-60-60.png)`

		return div
	}

	private _getCacheKey(x: number | string, y: number | string, z: number | string) {
		return `${x}|${y}|${z}`
	}

	// TODO: refactor picking
	// raycast(polaris: AbstractPolaris, canvasCoords: CoordV2, ndc: CoordV2): PickEvent | undefined {
	// 	if (!this.tileManager || !(polaris instanceof PolarisGSI)) return

	// 	const markers: Marker[] = []
	// 	const meshes: Mesh[] = []

	// 	const renderableList = this.tileManager.getVisibleTiles()
	// 	renderableList.forEach((r) => markers.push(...(r.layers as Marker[])))
	// 	renderableList.forEach((r) => meshes.push(...(r.meshes as Mesh[])))

	// 	// pick markers
	// 	for (let i = 0; i < markers.length; i++) {
	// 		const marker = markers[i]
	// 		const pickResult = marker.pick(polaris, canvasCoords, ndc)
	// 		if (pickResult) {
	// 			const feature = this._renderableFeatureMap.get(marker)
	// 			pickResult.index = feature.index
	// 			pickResult.data = {
	// 				type: 'cluster',
	// 				feature,
	// 				curr: feature,
	// 			}
	// 			return pickResult
	// 		}
	// 	}

	// 	// pick points
	// 	for (let i = 0; i < meshes.length; i++) {
	// 		const mesh = meshes[i]
	// 		if (!mesh.extras) continue
	// 		const pickHelper = mesh.extras.pickHelper as PointsMeshPickHelper
	// 		const pickResult = pickHelper.pick(polaris, canvasCoords)
	// 		if (pickResult) {
	// 			const features = this._renderableFeatureMap.get(mesh)
	// 			const feature = features[pickResult.index]
	// 			pickResult.index = feature.index
	// 			pickResult.data = {
	// 				type: 'point',
	// 				feature,
	// 				curr: feature, // backward compatibility
	// 			}
	// 			return pickResult
	// 		}
	// 	}

	// 	return
	// }

	private _updatePointSizeByIndex(mesh: Mesh, index: number, size: number) {
		const attr = mesh.geometry?.attributes.aSize
		if (!attr) return
		const array = attr.array
		if (isDISPOSED(array)) return
		array[index] = size

		if (!attr.extensions) attr.extensions = {}
		if (!attr.extensions.EXT_buffer_partial_update)
			attr.extensions.EXT_buffer_partial_update = { updateRanges: [] }

		attr.extensions.EXT_buffer_partial_update.updateRanges.push({
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
		const pointSize = this.getProps('pointSize') * this._ratio
		const pointHoverSize = this.getProps('pointHoverSize') * this._ratio
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

	private _releaseTile(tile: TileRenderables, token: TileToken) {
		const featureIdKey = this.getProps('featureIdKey')

		tile.meshes.forEach((mesh) => {
			// for non-cluster points mesh, features is a list
			const meshFeatures = this._renderableFeatureMap.get(mesh as Mesh) as any[]
			if (!meshFeatures) return

			meshFeatures.forEach((feature) => {
				const id = feature.properties[featureIdKey] as number | string
				const index = feature.index

				this._indexMeshMap.delete(index)
				this._idMeshesMap.delete(id)
				// @NOTE: style caches should not be deleted
			})

			// delete renderableFeatures map
			this._renderableFeatureMap.delete(mesh as Mesh)
		})

		tile.layers.forEach((marker) => {
			// for marker, feature is an object
			const feature = this._renderableFeatureMap.get(marker as Marker)
			if (!feature) return

			const id = feature.properties[featureIdKey] as number | string
			const index = feature.index

			this._indexMeshMap.delete(index)
			this._idMeshesMap.delete(id)

			// delete renderableFeatures map
			this._renderableFeatureMap.delete(marker as Marker)
		})
	}
}
