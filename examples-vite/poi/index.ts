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

const h = new HelperLayer({ length: 10000 })
p.add(h)
h.setProps({ box: false })
globalThis.p = p
console.log(p)

p.setStatesCode('1|120.078445|30.305767|0.000000|0.00000|0.00000|10.71268')

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
	dataType: 'geojson',
	pointSize: 24,
	pointHoverSize: 24,
	pointOffset: [0.0, 0.5],
	getPointColor: '#1f5f9f',
	pointImage:
		'https://img.alicdn.com/imgextra/i2/O1CN01NdsW721dq2EvEQ7ka_!!6000000003786-2-tps-64-64.png',
	pointColorBlend: 'add',
	clusterSize: 48,
	clusterColor: '#ffaf99',
	clusterImage:
		'https://img.alicdn.com/imgextra/i2/O1CN016yGVRh1Tdzf8SkuLn_!!6000000002406-2-tps-60-60.png',
	clusterColorBlend: 'add',
	minZoom: 3,
	maxZoom: 20,
	getUrl: getPOIUrl,
	featureIdKey: 'f4',
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

function getPOIUrl(x, y, z) {
	return 'https://fbi-geography.oss-cn-hangzhou.aliyuncs.com/tests/oneTilePOI.json'
}
