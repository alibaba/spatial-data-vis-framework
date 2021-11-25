import { PolygonLayer, LineStringLayer } from '@polaris.gl/layer-geojson'
import { ScatterLayer } from '@polaris.gl/layer-scatter'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'

const p = new PolarisGSIGL2({
	container: document.querySelector('#container') as HTMLDivElement,
	width: 500,
	height: 500,
})
p.timeline.config.ignoreErrors = false
p.setStatesCode('1|118.479716|36.286937|0.000000|0.70540|-0.03000|2.61800')

const polygonLayer = new PolygonLayer({
	getFillColor: '#689826',
	getSideColor: '#999999',
	getThickness: 1,
	enableExtrude: true,
	opacity: 1.0,
	baseAlt: 0,
})
p.add(polygonLayer)

const lineLayer = new LineStringLayer({
	level: 2,
	color: 'rgba(34,48,84,1)',
	opacity: 1,
	lineWidth: 5,
	pointSize: 5,
	baseAlt: 0,
	depthTest: true,
	renderOrder: -88,
})
p.add(lineLayer)

// fetch('https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/simple/amap/China_Fill_Dissolved_25.json')
// 	.then((r) => r.json())
// 	.then((geojson) => {
// 		polygonLayer.updateData(geojson)
// 		p.setStatesCode('1|118.479716|36.286937|0.000000|0.70540|-0.03000|2.61800')

// 		setTimeout(() => {
// 			fetch('https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/simple/330000.amap.json')
// 				.then((r) => r.json())
// 				.then((geojson) => {
// 					polygonLayer.updateData(geojson)
// 				})
// 		}, 5000)
// 	})

// polygonLayer.updateData(
// 	'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/simple/amap/China_Fill_Dissolved_25.json'
// )
lineLayer.updateData(
	'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/simple/amap/China_Line_25.json'
)

// setTimeout(() => {
// 	polygonLayer.updateData(
// 		'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/simple/330000.amap.json'
// 	)
// }, 3000)

// const scatterLayer = new ScatterLayer({
// 	size: 0.75,
// 	opacity: 0.6,
// 	color: '#B900FD',
// 	map: 'https://img.alicdn.com/tfs/TB1X4pmgAyWBuNjy0FpXXassXXa-64-64.png',
// 	enableBlending: true,
// 	enableShining: true,
// 	sizeAttenuation: false,
// 	shiningSpeed: 2,
// 	colNumber: 1,
// 	rowNumber: 1,
// 	baseAlt: 0,
// 	renderOrder: 0,
// 	depthTest: false,
// 	data: [],
// })
// p.add(scatterLayer)

// scatterLayer.updateProps({
// 	data: 'https://gw.alipayobjects.com/os/bmw-prod/a8616faf-b490-4299-b94c-3e3c054d923e.json',
// })

// window['p'] = p
// window['layer'] = polygonLayer
