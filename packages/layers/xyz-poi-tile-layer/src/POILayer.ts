import { isDISPOSED } from '@gs.i/schema'
import { GoogleXYZTileManager } from '@polaris.gl/utils-tile-manager'
import { Marker } from '@polaris.gl/layer-std-marker'
import { IRequestManager, CommonRequestManager } from '@polaris.gl/utils-request-manager'
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
	 * GoogleTile base request url, use [x], [y], [z] for tile numbers
	 * @example 'https://fbi-geography.oss-cn-hangzhou.aliyuncs.com/tests/poi/[z]/geojson_[x]_[y].bin'
	 */
	url: string

	/**
	 * Set requested Tile data type
	 * Not needed if the requestManager instance has been set
	 */
	dataType?: 'geojson' | 'arraybuffer'

	/**
	 * The 'id' prop in feature.properties is essential for XYZ tiles
	 * especially for user interactions such as styling
	 * the default idPropKey is 'id', but you can change it for your own applications
	 * this property value should be UNIQUE for each valid geo feature
	 */
	idPropKey: string

	/**
	 * Geometry base alt
	 */
	baseAlt: number

	/**
	 * POI image url
	 */
	pointImage: string

	/**
	 * Cluster image url
	 */
	clusterImage: string

	/**
	 * point size (px)
	 */
	pointSize: number

	/**
	 * cluster size (px)
	 */
	clusterSize: number

	/**
	 * get poi color (bot clustered)
	 */
	getPointColor: number | string | ((feature: any) => number | string)

	/**
	 * get clustered poi image
	 */
	getClusterImage: string | ((feature: any) => string)

	/**
	 * cluster dom style
	 */
	clusterDOMStyle: any

	/**
	 * Pass in user custom RequestManager to replace the default one
	 * Usually you want to pass a requestManager from outside because you want several layers using the same tile resource
	 */
	requestManager?: IRequestManager

	/**
	 * Custom feature filter, return true to mark that poi as valid point
	 * return {false} to skip this feature
	 */
	featureFilter: (feature: any) => boolean

	/**
	 * custom cluster filter
	 * return {number} to mark this feature as cluster, the number will be rendered on marker
	 * return {undefined} to mark this feature as point
	 */
	clusterNumFilter: (feature: any) => number | undefined

	/**
	 * point hover size
	 */
	hoverSize: number
}

/**
 * 配置项 默认值
 */
const defaultProps: POILayerProps = {
	url: 'https://fbi-geography.oss-cn-hangzhou.aliyuncs.com/tests/poi/[z]/geojson_[x]_[y].bin',
	dataType: 'arraybuffer',
	idPropKey: 'id',
	baseAlt: 0,
	pointImage:
		'https://img.alicdn.com/imgextra/i3/O1CN01naDbsE1HeeoOqvic6_!!6000000000783-2-tps-256-256.png',
	clusterImage:
		'https://img.alicdn.com/imgextra/i2/O1CN01vMISA21Vf1htL2Sza_!!6000000002679-2-tps-256-256.png',
	pointSize: 16,
	clusterSize: 64,
	getPointColor: '#ffafff',
	getClusterImage:
		'https://img.alicdn.com/imgextra/i1/O1CN01yyOfXC23ffGrhohq7_!!6000000007283-2-tps-53-52.png',
	clusterDOMStyle: {},
	featureFilter: (feature) => true,
	clusterNumFilter: (feature) => undefined,
	hoverSize: 32,
}

export type TileRenderables = {
	meshes: Mesh[]
	layers: STDLayer[]
}

export class POILayer extends STDLayer {
	matr: MatrPoint
	// geoMap: Map<string, any>
	requestManager: IRequestManager
	tileManager: GoogleXYZTileManager

	private _featureCount: number
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
	private _idMeshesMap: Map<string, { obj: Mesh | Marker; objIdx: number }[]>

	/**
	 * Map for storing styled feature ids
	 * for setting styles among different tiles for the same geo poi
	 */
	private _styledIdsMap: Map<string, string>

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

		this.listenProps(
			[
				'url',
				'dataType',
				'idPropKey',
				'baseAlt',
				'pointImage',
				'clusterImage',
				'getPointColor',
				'getClusterImage',
				'clusterStyle',
				'pointSize',
				'clusterSize',
				'featureFilter',
				'clusterNumFilter',
				'requestManager',
			],
			() => {
				this._featureCount = 0

				this._renderableFeatureMap = new Map()

				this._indexMeshMap = new Map()

				this._idMeshesMap = new Map()

				this._styledIdsMap = new Map()

				this._createPointImgElement()

				this.matr = this._createPointMatr()

				if (this.requestManager) {
					console.error('Cannot change/modify RequestManager in runtime! ')
					return
				}

				let dataType
				if (this.getProps('dataType') === 'arraybuffer') {
					dataType = 'arraybuffer'
				} else if (this.getProps('dataType') === 'geojson') {
					dataType = 'json'
				} else {
					throw new Error(`Invalid dataType prop value: ${this.getProps('dataType')}`)
				}

				this.requestManager =
					this.getProps('requestManager') ??
					new CommonRequestManager({
						dataType,
					})

				this.tileManager = new GoogleXYZTileManager({
					layer: this,
					getTileRenderables: (tileToken) => {
						return this._createTileRenderables(tileToken, projection, polaris)
					},
				})
			}
		)

		this.onViewChange = () => {
			this.tileManager.update(p, projection)
		}

		/** picking */
		this.onHover = this._pickPOI
		this.onClick = this._pickPOI

		/** highlight api */
		this.highlightByIndices = (dataIndexArr: number[], style: { [name: string]: any }) => {
			if (!this._indexMeshMap) return
			if (!style || !style.type) return

			const type = style.type
			const pointSize = this.getProps('pointSize')
			const hoverSize = this.getProps('hoverSize')
			dataIndexArr.forEach((index) => {
				const idxInfo = this._indexMeshMap.get(index)
				if (!idxInfo) return
				const obj = idxInfo.obj
				const objIdx = idxInfo.objIdx
				if (obj instanceof Marker) {
					/** @TODO react on marker highlight */
					return
				} else if (obj instanceof Mesh) {
					if (type === 'none') {
						this._updatePointSizeByIndex(obj, objIdx, pointSize)
					} else if (type === 'hover') {
						this._updatePointSizeByIndex(obj, objIdx, hoverSize)
					}
				}
			})
		}

		/** highlight api 2 */
		this.highlightByIds = (idsArr: (number | string)[], style: { [name: string]: any }) => {
			if (!this._idMeshesMap) return
			if (!style || !style.type) return

			const type = style.type
			const pointSize = this.getProps('pointSize')
			const hoverSize = this.getProps('hoverSize')
			idsArr.forEach((id) => {
				const idStr = id.toString()
				const meshInfos = this._idMeshesMap.get(idStr)
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
							this._styledIdsMap.delete(idStr)
						} else if (type === 'hover') {
							this._updatePointSizeByIndex(obj, objIdx, hoverSize)
							this._styledIdsMap.set(idStr, 'hover')
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
		this._styledIdsMap = new Map()
		this.requestManager.dispose()
		this.tileManager.dispose()
	}

	private _createPointImgElement() {
		this._pointImgElem = new Image()
		this._pointImgElem.setAttribute('crossOrigin', 'anonymous')
		this._pointImgElem.src = this.getProps('pointImage')
	}

	private _createTileRenderables(token, projection, polaris) {
		const dataType = this.getProps('dataType')
		const x = token[0],
			y = token[1],
			z = token[2]
		const url = this.getProps('url').replace('[x]', x).replace('[y]', y).replace('[z]', z)
		const req = this.requestManager.request(url)
		const cacheKey = this._getCacheKey(x, y, z)

		return new Promise<TileRenderables>((resolve, reject) => {
			req
				.then((response) => {
					let geojson: any
					if (dataType === 'arraybuffer') {
						geojson = decode(new Pbf(response))
					} else if (dataType === 'geojson') {
						geojson = response
					} else {
						console.error(`Invalid dataType prop value: ${dataType}`)
						return
					}

					const tile = this._createTileMesh(geojson, projection, polaris)
					if (tile) {
						resolve(tile)
						return
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

	private _createPointMatr() {
		const matr = new MatrPoint({
			alphaMode: 'BLEND',
			size: this.getProps('pointSize'),
			baseColorFactor: { r: 1, g: 1, b: 1 },
			baseColorTexture: {
				image: { uri: this.getProps('pointImage'), flipY: true },
				sampler: { minFilter: 'NEAREST_MIPMAP_LINEAR', magFilter: 'LINEAR' },
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
			`,
			fragColor: `
				fragColor.rgb = vColor;
			`,
		})
		return matr
	}

	private _createTileMesh(
		geojson: any,
		projection: Projection,
		polaris: Polaris
	): TileRenderables | undefined {
		if (!geojson.type || geojson.type !== 'FeatureCollection') {
			return
		}

		const mesh = new Mesh({
			name: 'points-mesh',
		})

		const idPropKey = this.getProps('idPropKey')
		const baseAlt = this.getProps('baseAlt')
		const featureFilter = this.getProps('featureFilter')
		const clusterNumFilter = this.getProps('clusterNumFilter')
		const clusterSize = this.getProps('clusterSize')
		const pointSize = Math.round(this.getProps('pointSize'))
		const getPointColor = this.getProps('getPointColor')
		const getClusterImage = this.getProps('getClusterImage')

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

			// check id key
			const id = feature.properties[idPropKey] as number | string
			if (id === undefined || id === null) {
				console.error(
					`feature does not have idPropKey: ${idPropKey}, please check tile data or layer config`
				)
				return
			}

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

			const coords = feature.geometry.coordinates as number[]
			const clusterNum = clusterNumFilter(feature)
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
				})
				layers.push(cluster)

				this._renderableFeatureMap.set(cluster, feature)
				const meshInfo = { obj: cluster, objIdx: 0 }
				this._setIndexMeshMap(feature.index, meshInfo)
				this._setIdMeshesMap(id, meshInfo)
			} else {
				// non-cluster point
				const xyz = projection.project(coords[0], coords[1], (coords[2] ?? 0) + baseAlt)
				const color = getPointColor(feature)
				const colorUint8 = colorToUint8Array(new Color(color))
				const styledSize = this._getPointStyledSize(this._styledIdsMap.get(id.toString()))
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
		mesh.extras.pickHelper = new PointsMeshPickHelper(mesh, this._pointImgElem, polaris, 'aSize')
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

		const style = div.style
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
		style.backgroundPosition = 'center'
		style.backgroundSize = pxSize + 'px'

		return div
	}

	private _getCacheKey(x: number | string, y: number | string, z: number | string) {
		return `${x}|${y}|${z}`
	}

	private _pickPOI(polaris: Base, canvasCoords: CoordV2, ndc: CoordV2): PickEvent | undefined {
		if (!this.tileManager || !(polaris instanceof PolarisGSI)) return

		const markers: Marker[] = []
		const meshes: Mesh[] = []

		const renderableList = this.tileManager.getCurrVisibleTiles()
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
					curr: feature,
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
		id = id.toString()
		if (this._idMeshesMap.has(id)) {
			this._idMeshesMap.get(id)?.push(obj)
		} else {
			this._idMeshesMap.set(id, [obj])
		}
	}

	private _setIndexMeshMap(index: number, obj: any) {
		this._indexMeshMap.set(index, obj)
	}

	private _getPointStyledSize(style?: string): number {
		const pointSize = this.getProps('pointSize')
		const hoverSize = this.getProps('hoverSize')
		if (!style) {
			return pointSize
		}
		if (style === 'none') {
			return pointSize
		}
		if (style === 'hover') {
			return hoverSize
		}
		return pointSize
	}
}
