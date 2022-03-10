import { StandardLayer } from '@polaris.gl/gsi'
import { PolarisLite } from '@polaris.gl/lite'

import { generateScene } from '@gs.i/utils-random-scene'
import { IndicatorProcessor } from '@gs.i/processor-indicator'
import { HelperLayer } from '@polaris.gl/layer-std-helper'

import { LabelLayer } from '@polaris.gl/layer-label'
import { MercatorProjection } from '@polaris.gl/projection'
import { AMapLayer } from '@polaris.gl/layer-amap'

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

getLabelData().then((data) => {
	const labelLayer = new LabelLayer({
		text_color: 'rgba(255,255,255,1)',
		text_size: 12,
		text_family: 'PingFangSC-Semibold',
		text_weight: 'normal',
		text_shadow_px: 1,
		text_shadow_color: '#000',
		text_translate_x: -0.5,
		text_translate_y: -0.5,
		markerCompareEnlargePx: 5, // Label之间比较时的放大数值，单位px
		inverseByBgColor: true, // 开启根据背景色反色
		// 背景色的callback
		getBgColor: (feature) => {
			const r = Math.floor(155 + Math.random() * 100).toString(16)
			const color = `#${r}aa${r}`
			return color
		},
		debug: false,
		// 自定义text style
		// customTextStyle: (dataItem) => {
		//     const r = Math.round(Math.random() * 255).toString(16)
		//     const g = Math.round(Math.random() * 255).toString(16)
		//     const b = Math.round(Math.random() * 255).toString(16)
		//     return {
		//         text_color: `#${r}${g}${b}`,
		//         text_shadow_px: Math.random() > 0.5 ? 0 : 0.5,
		//         text_size: 12 + Math.random() * 4,
		//     }
		// },
		data,
	})
	p.add(labelLayer)
	window['layer'] = labelLayer

	p.setStatesCode('1|103.506587|36.167078|0.000000|0.78540|0.00000|4.25200')
})

async function getLabelData() {
	const urls = await fetch('https://fbi-geography.oss-cn-hangzhou.aliyuncs.com/urls.json')
	const { base_url, uris, adcode_placeholder } = await urls.json()
	const res = await fetch(base_url + uris.all_100000_json)
	const geoJsonData = await res.json()

	const countryRegion = { ...geoJsonData, features: [] }
	const regionsRegion = { ...geoJsonData, features: [] }
	const provinceRegion = { ...geoJsonData, features: [] }
	const cityRegion = { ...geoJsonData, features: [] }
	const districtRegion = { ...geoJsonData, features: [] }
	geoJsonData.features.forEach((feature) => {
		const level = feature.properties.level
		const adcode = feature.properties.adcode
		if (adcode === '100000') {
			countryRegion.features.push(feature)
			return
		}
		if (new Set(['region', 'province', 'city', 'district']).has(level)) {
			if (level === 'region') {
				regionsRegion.features.push(feature)
			} else if (level === 'province') {
				provinceRegion.features.push(feature)
			} else if (level === 'city') {
				cityRegion.features.push(feature)
			} else if (level === 'district') {
				districtRegion.features.push(feature)
			}
		}
	})

	const labels: any[] = []
	for (let i = 0; i < provinceRegion.features.length; i++) {
		const feature = provinceRegion.features[i]
		const properties = feature.properties
		if (!properties) continue
		let center
		if (properties.centroid) {
			center = properties.centroid
		} else if (Array.isArray(properties.center)) {
			center = properties.center
		} else if (typeof properties.center === 'string') {
			center = properties.center.split(',').map((v) => parseFloat(v))
		}
		labels.push({
			lng: center[0],
			lat: center[1],
			name: `${properties?.name}  ${Math.random().toFixed(5)}` ?? '',
			feature: feature,
		})
	}
	return labels
}
