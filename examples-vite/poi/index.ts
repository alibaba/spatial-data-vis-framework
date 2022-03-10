import { StandardLayer } from '@polaris.gl/base-gsi'
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
import { POILayer } from '@polaris.gl/layer-xyz-poi-tile'

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

const h = new HelperLayer({ parent: p, length: 10000 })
h.setProps({ box: false })
globalThis.p = p
console.log(p)

p.setStatesCode('1|120.184301|30.265237|0.000000|0.00000|0.00000|16.70400') // closer hz

const framesBeforeRequest = 10
const viewZoomReduction = 0

// POI
let lastHovered
const poi = new POILayer({
	// geojsonFilter: (geojson) => {
	// 	console.log('poi', geojson)
	// },
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
	pickable: false,
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
						clustering_scalar: 1000,
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
