import { Timeline } from 'ani-timeline'
import { SphereProjection } from '@polaris.gl/projection'
import { PolygonLayer, LineStringLayer } from '@polaris.gl/layer-geojson'
import { PolarisLite } from '@polaris.gl/lite'
import { HelperLayer } from '@polaris.gl/layer-std-helper'

const timeline = new Timeline({
	duration: Infinity,
	pauseWhenInvisible: false, // 检测标签页是否隐藏，已知在一些环境中不可用，建议关闭
	openStats: true, // 开启性能监控
	autoRecevery: true, // 自动回收过期的track
	maxStep: 100, // 最大帧长
	maxFPS: 30, // 最大帧率
	ignoreErrors: false, // 出错后是否停止
})
const p = new PolarisLite({
	container: document.querySelector('#container') as HTMLDivElement,
	width: 800,
	height: 800,
	timeline,
	lights: {},
})

p.add(new HelperLayer({ length: 10000, box: false }))

// Polygons
const polygonLayer1 = new PolygonLayer({
	getFillColor: (feature) => {
		const r = Math.floor(100 + Math.random() * 155).toString(16)
		const color = `#${r}aa${r}`
		return color
	},
	getSideColor: '#999999',
	getFillOpacity: 1.0,
	getThickness: 300000,
	enableExtrude: true,
	baseAlt: 0,
	depthTest: true,
	pickable: true,
	selectLinesHeight: 1000,
	selectColor: false,
	hoverColor: false,
	selectLineWidth: 4,
	hoverLineWidth: 2,
	workersCount: 2,
})
p.add(polygonLayer1)
polygonLayer1.updateData('https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/json/china_full.json')
polygonLayer1.onPicked = (info) => {
	console.log('onPicked', info)
}
polygonLayer1.onHovered = (info) => {
	// console.log('onHovered', info)
	if (info) {
		polygonLayer1.highlightByIndices([info.index], { type: 'hover' })
	}
}

const polygonLayer2 = new PolygonLayer({
	getFillColor: () => Math.random() * 0xffffff,
	getSideColor: '#999999',
	getFillOpacity: 1.0,
	getThickness: 300000,
	enableExtrude: true,
	baseAlt: 0,
	depthTest: true,
	pickable: true,
	selectLinesHeight: 1000,
	workersCount: 2,
})
p.add(polygonLayer2)
polygonLayer2.updateData(
	'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/examples/country_unemployment_from_kepler.geojson'
)

p.setStatesCode('1|-1.191044|56.161481|0.000000|0.70540|-0.03000|1.73000')
// p.setStatesCode('1|103.269399|37.125345|0.000000|0.12540|-0.02000|4.07800')

// Line
const lineLayer = new LineStringLayer({
	color: '#5e3894',
	lineWidth: 3,
	baseAlt: 10,
	texture: undefined,
})
p.add(lineLayer)
lineLayer.updateData('https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/world-coastline.json')

//

window['p'] = p
window['layer1'] = polygonLayer1
window['layer2'] = polygonLayer2
window['line'] = lineLayer
