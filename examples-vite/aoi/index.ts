import { StandardLayer } from '@polaris.gl/gsi'
import { PolarisLite } from '@polaris.gl/lite'

import { generateScene } from '@gs.i/utils-random-scene'
import { IndicatorProcessor } from '@gs.i/processor-indicator'
import { HelperLayer } from '@polaris.gl/layer-std-helper'
import { LodLineStringLayer, PolygonLayer } from '@polaris.gl/layer-geojson'
import { FlyLineLayer, FlyLine } from '@polaris.gl/layer-flyline'
import { ScatterLayer } from '@polaris.gl/layer-scatter'
import { AOILayer } from '@polaris.gl/layer-xyz-aoi-tile'
import { AMapLayer } from '@polaris.gl/layer-amap'
import { MercatorProjection } from '@polaris.gl/projection'

const p = new PolarisLite({
	container: document.querySelector('#container') as HTMLDivElement,
	background: 'transparent',
	// autoplay: false,
	asyncRendering: true,
	projection: new MercatorProjection({
		center: [104, 35.4],
	}),
})

// amap
const amapLayer = new AMapLayer({
	// showLogo: false,
})
p.add(amapLayer)

const h = new HelperLayer({ length: 10000 })
p.add(h)
h.setProps({ box: false })
globalThis.p = p
console.log(p)

p.setStatesCode('1|120.184301|30.265237|0.000000|0.00000|0.00000|16.70400') // closer hz

const framesBeforeRequest = 10
const viewZoomReduction = 0

// AOI
const picked: Set<number> = new Set()
let hovered
const aoi = new AOILayer({
	// geojsonFilter: (geojson) => {
	// 	console.log('aoi', geojson)
	// },
	workersNum: Math.max(navigator.hardwareConcurrency - 4, 0),
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
	// pickable: true,
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
					simplify_scalar: 10,
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
