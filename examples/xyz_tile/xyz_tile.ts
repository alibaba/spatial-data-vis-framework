import { MercatorProjection } from '@polaris.gl/projection'
import { POILayer } from '@polaris.gl/layer-xyz-poi-tile'
import { AOILayer } from '@polaris.gl/layer-xyz-aoi-tile'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { AMapLayer } from '@polaris.gl/layer-amap'

document.body.style.backgroundColor = '#333'

const p = new PolarisGSIGL2({
	container: document.querySelector('#container') as HTMLDivElement,
	width: 800,
	height: 800,
	ratio: 2,
	lights: {},
	autoResize: true,
	asyncRendering: true,
	projection: new MercatorProjection({
		center: [104, 35.4],
	}),
})
window['p'] = p
p.timeline.config.ignoreErrors = false

const size = 20
const framesBeforeRequest = 10
const viewZoomReduction = 0

// POI
let lastHovered
const poi = new POILayer({
	framesBeforeRequest,
	viewZoomReduction,
	dataType: 'pbf',
	pointSize: size,
	pointHoverSize: 24,
	pointOffset: [0.0, 0.5],
	getPointColor: '#ffaf99',
	pointImage:
		'https://img.alicdn.com/imgextra/i2/O1CN01VcJVlk28INDH4OCXH_!!6000000007909-2-tps-500-500.png',
	pointColorBlend: 'add',
	clusterSize: 40,
	clusterColor: '#00afff',
	clusterImage:
		'https://img.alicdn.com/imgextra/i2/O1CN016yGVRh1Tdzf8SkuLn_!!6000000002406-2-tps-60-60.png',
	clusterColorBlend: 'add',
	minZoom: 3,
	maxZoom: 20,
	getUrl: getPOIUrl,
	getClusterContent: (feature) => {
		if (feature.properties.number_of_point > 1) {
			const count = Math.round(feature.properties.number_of_point)
			if (count > 99) {
				return '99+'
			}
			return count.toString()
		}
		return
	},
	getClusterDOMStyle: (feature) => {
		// const count = Math.round(feature.properties.number_of_point)
		return {
			fontSize: '14px',
			color: '#fff',
		}
	},
	pickable: true,
	onPicked: (data) => {
		console.log('data', data)
	},
	onHovered: (data) => {
		if (lastHovered !== undefined) {
			poi.highlightByIds([lastHovered], { type: 'none' })
		}

		if (!data || data.data.feature === undefined) return

		const feature = data.data.feature
		const id = feature.properties.id
		if (!id) return
		poi.highlightByIds([id], { type: 'hover' })
		lastHovered = id

		console.log('id', id)
	},
	renderOrder: 100,
})
p.add(poi)
window['poi'] = poi

// AOI
const picked: Set<number> = new Set()
let hovered
const aoi = new AOILayer({
	viewZoomReduction,
	framesBeforeRequest,
	customFetcher: (x, y, z) => {
		const url = getAOIUrl(x, y, z)
		const controller = new AbortController()
		const signal = controller.signal
		const promise = new Promise<any>((resolve, reject) => {
			fetch(url, { signal })
				.then((res) => {
					resolve(res.arrayBuffer())
				})
				.catch((e) => {
					reject(e)
				})
		})
		const abort = () => {
			controller.abort()
			return { success: true }
		}
		return {
			promise,
			abort,
		}
	},
	// getUrl: getAOIUrl,
	getColor: (feature) => feature.properties.id * 13,
	getOpacity: 0.5,
	transparent: true,
	hoverLineWidth: 2,
	hoverLineColor: '#333333',
	selectLineWidth: 4,
	selectLineColor: '#00afff',
	pickable: true,
	onPicked: (info) => {
		console.log('info', info)
		// aoi.highlightByIds(Array.from(picked), { type: 'none' })
		// picked.clear()
		if (info && info.data && info.data.feature) {
			const feature = info.data.feature
			const id = feature.properties.id
			aoi.highlightByIds([id], { type: 'select' })
			picked.add(id)
			console.log('feature id', id)
		} else {
			aoi.highlightByIds(Array.from(picked), { type: 'none' })
			picked.clear()
		}
	},
	onHovered: (info) => {
		if (info && info.data && info.data.feature) {
			const feature = info.data.feature
			const id = feature.properties.id
			aoi.highlightByIds([hovered], { type: 'none' })
			aoi.highlightByIds([id], { type: 'hover' })
			hovered = id
		} else {
			aoi.highlightByIds([hovered], { type: 'none' })
		}
		picked.forEach((id) => {
			aoi.highlightByIds([id], { type: 'select' })
		})
	},
})
p.add(aoi)
window['aoi'] = aoi

// amap
const amapLayer = new AMapLayer({
	showLogo: false,
})
p.add(amapLayer)

// info panel
const panel = document.createElement('div')
panel.style.position = 'absolute'
panel.style.left = '5px'
panel.style.top = '5px'
panel.style.border = '2px dashed green'
panel.style.fontSize = '14px'
panel.style.padding = '2px'
panel.innerText = ''
document.body.appendChild(panel)
p.timeline.addTrack({
	duration: Infinity,
	startTime: p.timeline.currentTime,
	onUpdate: () => {
		let info = ''

		if (poi && p.children.has(poi)) {
			info += 'poi:' + '\n'
			info += 'vis tiles: ' + poi.tileManager.getVisibleTiles().length + '\n'
			info += 'pends: ' + poi.getState().pendsCount + '\n'
		}

		if (aoi && p.children.has(aoi)) {
			info += 'aoi:' + '\n'
			info += 'vis tiles: ' + aoi.tileManager.getVisibleTiles().length + '\n'
			info += 'pends: ' + aoi.getState().pendsCount + '\n'

			const reqTimes = aoi.tileManager
				.getVisibleTiles()
				.map((tile) => Math.round(aoi.info.times.get(tile.key).reqTime))
			info += 'max req: ' + Math.max(...reqTimes) + 'ms\n'

			const genTimes = aoi.tileManager
				.getVisibleTiles()
				.map((tile) => Math.round(aoi.info.times.get(tile.key).genTime))
			info += 'max gen: ' + Math.max(...genTimes) + 'ms\n'
		}

		if (panel.innerText !== info) {
			panel.innerText = info
		}
	},
})

setTimeout(() => {
	p.setStatesCode('1|120.184302|30.265237|0.000000|0.00000|0.00000|11.74200')
	// p.setStatesCode('1|120.184301|30.265237|0.000000|0.00000|0.00000|16.70400') // closer hz
})

//

function getPOIUrl(x, y, z) {
	const params = {
		PostgreSQL: {
			dbname: 'test-1',
			user: 'kou_admin',
			password: 'kou_admin1234',
			host: 'pgm-bp1oi8k60xk5861j146270.pg.rds.aliyuncs.com',
			port: '1921',
		},
		fc_param: {
			x,
			y,
			z,
			id_column: 'id',
			geometry_column: 'geometry',
			clip_geometry: null,
			area_code: null,
			source: 'hz_house_order',
			output_format: 'geojson_pbf',
			layer: {
				default: {
					geometry_type: 'point',
					visible_columns: ['count'],
					filter_expression: [],
					visible_zlevel: [1, 20],
					clickable_zlevel: [15, 20],
					aggregation: {
						zlevel: [1, 15],
						clustering_method: 'bin',
						clustering_scalar: 500,
						fields: {
							count_number: ['id', 'count'],
							sum_number: ['count', 'sum'],
						},
					},
				},
			},
		},
	}
	return (
		'http://223675737204339375.cn-zhangjiakou-test-corp.test.fc.aliyun-inc.com/2016-08-15/proxy/fbi-geo.py-get-mvt__stable/py-get-mvt/api?data=' +
		JSON.stringify(params)
	)
}

function getAOIUrl(x, y, z) {
	const params = {
		PostgreSQL: {
			dbname: 'test-1',
			user: 'kou_admin',
			password: 'kou_admin1234',
			host: 'pgm-bp1oi8k60xk5861j146270.pg.rds.aliyuncs.com',
			port: '1921',
		},
		fc_param: {
			x,
			y,
			z,
			id_column: 'id',
			geometry_column: 'geometry',
			clip_geometry: null,
			area_code: null,
			source: '浙江省_杭州市_building',
			output_format: 'geojson_pbf',
			layer: {
				default: {
					geometry_type: 'Polygon',
					visible_columns: [],
					simplify_scalar: 7,
					filter_expression: null,
					preserve_collapsed: false,
					with_boundary: true,
					visible_zlevel: [3, 20],
					clickable_zlevel: [13, 20],
				},
			},
		},
	}
	return (
		'http://223675737204339375.cn-zhangjiakou-test-corp.test.fc.aliyun-inc.com/2016-08-15/proxy/fbi-geo.py-get-mvt__stable/py-get-mvt/api?data=' +
		JSON.stringify(params)
	)
}
