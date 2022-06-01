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

p.setStatesCode('1|121.48195363210442|31.196897659037806|0.000000|0.00000|0.00000|15.00400') // closer sh

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
	dataType: 'geojson',
	customFetcher: (x, y, z) => {
		const url = getAOIUrl(x, y, z)
		const controller = new AbortController()
		const signal = controller.signal
		const promise = new Promise<any>((resolve, reject) => {
			fetch(url, { signal })
				.then((res) => {
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
	getColor: (feature) => Math.random() * 0xffffff,
	getOpacity: 0.5,
	transparent: true,
	hoverLineWidth: 4,
	hoverLineColor: '#333333',
	selectLineWidth: 8,
	selectLineColor: '#af3f5f',
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

function getAOIUrl(x, y, z) {
	return 'https://fbi-geography.oss-cn-hangzhou.aliyuncs.com/tests/oneTile.json'
}
