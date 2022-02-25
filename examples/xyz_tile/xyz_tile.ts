import { MercatorProjection } from '@polaris.gl/projection'
import { POILayer } from '@polaris.gl/layer-xyz-poi-tile'
import { AOILayer } from '@polaris.gl/layer-xyz-aoi-tile'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { AMapLayer } from '@polaris.gl/layer-amap'
import { PolygonLayer } from '@polaris.gl/layer-geojson'

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
	antialias: false,
})
window['p'] = p
p.timeline.config.ignoreErrors = false
p.onViewChange = (cam) => console.log('zoom', cam.zoom)

const framesBeforeRequest = 10
const viewZoomReduction = 0

// POI
let lastHovered
const poi = new POILayer({
	// geojsonFilter: (geojson) => {
	// 	console.log('poi', geojson)
	// },
	renderOrder: 200,
	baseAlt: 0,
	framesBeforeRequest,
	viewZoomReduction,
	dataType: 'pbf',
	pointSize: 20,
	pointHoverSize: 24,
	pointOffset: [0.0, 0.5],
	getPointColor: '#ffaf99',
	pointImage:
		'https://img.alicdn.com/imgextra/i2/O1CN01VcJVlk28INDH4OCXH_!!6000000007909-2-tps-500-500.png',
	pointColorBlend: 'add',
	clusterSize: 40,
	clusterColor: '#ffaf99',
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

		console.log('poi')

		const feature = data.data.feature
		const id = feature.properties.id
		if (!id) return
		poi.highlightByIds([id], { type: 'hover' })
		lastHovered = id

		// console.log('id', id)
	},
	useParentReplaceUpdate: true,
	// depthTest: false,
})
p.add(poi)
window['poi'] = poi

// AOI
const picked: Set<number> = new Set()
let hovered
const aoi = new AOILayer({
	// geojsonFilter: (geojson) => {
	// 	console.log('aoi', geojson)
	// },
	renderOrder: 100,
	baseAlt: 0,
	// workersNum: Math.max(navigator.hardwareConcurrency - 4, 0),
	workersNum: 0,
	maxZoom: 16,
	viewZoomReduction: 0,
	viewZoomStep: 1,
	framesBeforeRequest,
	customFetcher: (x, y, z) => {
		const url = getAOIUrl(x, y, z)
		const controller = new AbortController()
		const signal = controller.signal
		const promise = new Promise<any>((resolve, reject) => {
			fetch(url, { signal })
				.then((res) => {
					// resolve(res.arrayBuffer())
					resolve(res.json())
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
	dataType: 'geojson',
	getColor: (feature) => feature.properties.id * 13,
	getOpacity: 0.5,
	transparent: true,
	hoverLineWidth: 2,
	hoverLineColor: '#333333',
	unHoveredLineColor: '#111111',
	unHoveredLineOpacity: 0.3,
	selectLineWidth: 6,
	selectLineColor: '#00afff',
	pickable: true,
	debug: true,
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
			console.log('aoi')
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

async function fetchData() {
	const data: any[] = []

	const response = await fetch(
		'https://gw.alipayobjects.com/os/bmw-prod/69f76d0b-8758-49cc-86e7-6fc5728cb3ea.json' // geojson china all
	)
	const json = await response.json()
	data.push(json)

	return data
}

// fetchData().then((data) => {
// 	const geojson = data[0]
// 	const newGeo = { ...geojson, features: [] }

// 	console.log('newGeo', newGeo)

// 	geojson.features.forEach((feature) => {
// 		const level = feature.properties.level
// 		const adcode = feature.properties.adcode
// 		if (adcode === '100000') {
// 			return
// 		}
// 		if (level === 'province') {
// 			newGeo.features.push(Object.assign({}, feature))
// 			return
// 		}
// 	})

// 	// Polygons
// 	const polygonLayer1 = (window['layer1'] = new PolygonLayer({
// 		// projection: new SphereProjection({}),
// 		getFillColor: (feature) => {
// 			const r = Math.floor(100 + Math.random() * 155).toString(16)
// 			const color = `#${r}aa${r}`
// 			return color
// 		},
// 		getSideColor: '#999999',
// 		getFillOpacity: 1.0,
// 		transparent: false,
// 		getThickness: 0,
// 		enableExtrude: false,
// 		baseAlt: 0,
// 		depthTest: true,
// 		pickable: true,
// 		hoverColor: false,
// 		selectColor: false,
// 		hoverLineWidth: 1,
// 		selectLineWidth: 4,
// 		selectLinesHeight: 0,
// 		workersCount: 4,
// 	}))
// 	p.add(polygonLayer1)
// 	polygonLayer1.updateData(newGeo)
// 	polygonLayer1.onHovered = (info) => {
// 		if (!info) return

// 		console.log('polygon')
// 	}
// })

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
			info += '--- poi ---' + '\n'
			info += 'vis tiles: ' + poi.getLoadingStatus().total + '\n'
			info += 'pends: ' + poi.getLoadingStatus().pends + '\n'
		}

		if (aoi && p.children.has(aoi)) {
			info += '--- aoi ---' + '\n'
			info += 'vis tiles: ' + aoi.getLoadingStatus().total + '\n'
			info += 'pends: ' + aoi.getLoadingStatus().pends + '\n'

			const reqTimes = aoi['_tileManager']
				.getVisibleTiles()
				.map((tile) => Math.round(aoi.info.times.get(tile.key).reqTime))
			info += 'max req: ' + Math.max(...reqTimes) + 'ms\n'

			const genTimes = aoi['_tileManager']
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
	// p.setStatesCode('1|120.184302|30.265237|0.000000|0.00000|0.00000|16.55800')
	p.setStatesCode('1|120.184302|30.265237|0.000000|0.00000|0.00000|11.74200')
	// p.setStatesCode('1|120.184301|30.265237|0.000000|0.00000|0.00000|16.70400') // closer hz
}, 500)

//

function getPOIUrl(x, y, z) {
	const params = {
		PostgreSQL: {
			dbname: 'EXAMPLE',
			user: 'EXAMPLE',
			password: 'EXAMPLE',
			host: 'EXAMPLE',
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
		'EXAMPLE' +
		JSON.stringify(params)
	)
}

function getAOIUrl(x, y, z) {
	const params = {
		PostgreSQL: {
			dbname: 'EXAMPLE',
			user: 'EXAMPLE',
			password: 'EXAMPLE',
			host: 'EXAMPLE',
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
			output_format: 'geojson',
			layer: {
				default: {
					geometry_type: 'Polygon',
					visible_columns: [],
					simplify_scalar: 4,
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
		'EXAMPLE' +
		JSON.stringify(params)
	)
}

window['getAOIUrl'] = getAOIUrl
