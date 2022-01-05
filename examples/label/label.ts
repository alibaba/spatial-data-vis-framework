import { MercatorProjection } from '@polaris.gl/projection'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { AMapLayer } from '@polaris.gl/layer-amap'
import { LabelLayer } from '@polaris.gl/layer-label'

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

const amapLayer = new AMapLayer({
	showLogo: false, // 是否显示高德logo
	style: 'normal', // 主题有: 标准-normal, 幻影黑-dark,月光银-light,远山黛-whitesmoke,草色青-fresh,雅土灰-grey,涂鸦-graffiti,马卡龙-macaron,靛青蓝-blue,极夜蓝-darkblue,酱籽-wine
	layers: [
		// 地图显示图层集合: 卫星图层-Satellite,路网图层RoadNet,实施交通图层-Traffic
		{ name: 'TileLayer', show: true },
		{ name: 'Satellite', show: false },
		{ name: 'RoadNet', show: false },
		{ name: 'Traffic', show: false },
	],
	features: [
		// 地图显示要素集合: 区域面-bg,兴趣点-point,道路及道路标注-road,建筑物-building
		{ name: 'bg', show: true },
		{ name: 'point', show: false },
		{ name: 'road', show: true },
		{ name: 'building', show: false },
	],
})
p.add(amapLayer)
window['amap'] = amapLayer

const labelLayer = new LabelLayer({
	text_color: 'rgba(255,255,255,1)',
	text_size: 12,
	text_family: 'PingFangSC-Semibold',
	text_weight: 'normal',
	text_shadow_px: 1,
	text_shadow_color: '#000',
	text_translate_x: 0,
	text_translate_y: 0,
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
})
p.add(labelLayer)
window['layer'] = labelLayer

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

	const labels = []
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
