import { StandardLayer } from '@polaris.gl/base-gsi'
import { PolarisLite } from '@polaris.gl/lite'

import { generateScene } from '@gs.i/utils-random-scene'
import { IndicatorProcessor } from '@gs.i/processor-indicator'
import { HelperLayer } from '@polaris.gl/layer-std-helper'
import { LodLineStringLayer, PolygonLayer } from '@polaris.gl/layer-geojson'
import { FlyLineLayer, FlyLine } from '@polaris.gl/layer-flyline'

const p = new PolarisLite({
	container: document.querySelector('#container') as HTMLDivElement,
	// background: 'transparent',
	// autoplay: false,
})
const h = new HelperLayer({ parent: p, length: 10000 })
h.setProps({ box: false })
globalThis.p = p
console.log(p)

/**
 * FlyLineLayer
 */
const tDuration = 5000
const pre = [
	{
		lnglatStart: [114.109497, 22.396428],
		lnglatEnd: [111.517973, 36.08415],
		// duration: tDuration * Math.random(),
	},
	{
		lnglatStart: [139.6917064, 35.6894875],
		lnglatEnd: [113.122717, 23.028762],
		// duration: tDuration * Math.random(),
	},
	{
		lnglatStart: [151.2128511, -33.8668675],
		lnglatEnd: [116.405285, 39.904989],
		// duration: tDuration * Math.random(),
	},
	{
		lnglatStart: [-82.907123, 40.4172871],
		lnglatEnd: [111.297604, 23.474803],
		// duration: tDuration * Math.random(),
	},
	{
		lnglatStart: [127.6809317, 26.2124013],
		lnglatEnd: [119.649506, 29.089524],
		// duration: tDuration * Math.random(),
	},
	{
		lnglatStart: [2.6370411, 48.8499198],
		lnglatEnd: [120.153576, 30.287459],
		// duration: tDuration * Math.random(),
	},
	{
		lnglatStart: [151.2128511, -33.8668675],
		lnglatEnd: [114.161573, 22.282467],
		// duration: tDuration * Math.random(),
	},
	{
		lnglatStart: [-0.5950406, 51.5105384],
		lnglatEnd: [116.405285, 39.904989],
		// duration: tDuration * Math.random(),
	},
	{
		lnglatStart: [-91.8318334, 35.20105],
		lnglatEnd: [116.507676, 31.752889],
		// duration: tDuration * Math.random(),
	},
	{
		lnglatStart: [100.5143528, 13.8621125],
		lnglatEnd: [113.280637, 23.125178],
		// duration: tDuration * Math.random(),
	},
	{
		lnglatStart: [-105.7820674, 39.5500507],
		lnglatEnd: [111.46923, 27.237842],
		// duration: tDuration * Math.random(),
	},
	{
		lnglatStart: [23.3823545, -15.9454906],
		lnglatEnd: [114.085947, 22.547],
		// duration: tDuration * Math.random(),
	},
	{
		lnglatStart: [-85.3232139, 51.253775],
		lnglatEnd: [116.405285, 39.904989],
		// duration: tDuration * Math.random(),
	},
	{
		lnglatStart: [-79.0192997, 35.7595731],
		lnglatEnd: [123.429096, 41.796767],
		// duration: tDuration * Math.random(),
	},
	{
		lnglatStart: [-74.0059413, 40.7127837],
		lnglatEnd: [113.280637, 23.125178],
		// duration: tDuration * Math.random(),
	},
	{
		lnglatStart: [-119.4179324, 36.778261],
		lnglatEnd: [114.697802, 23.746266],
		// duration: tDuration * Math.random(),
	},
]

const data = pre.map((d) => {
	const { lnglatStart, lnglatEnd } = d
	return {
		lngStart: lnglatStart[0],
		latStart: lnglatStart[1],
		lngEnd: lnglatEnd[0],
		latEnd: lnglatEnd[1],
		// duration,
	}
})

const flyline = new FlyLineLayer({
	lineSegments: 80,
	minHeight: 0,
	maxHeight: 0.5,
})
flyline.updateData(data)

//
const polygonLayer = new PolygonLayer({
	getFillColor: (feature) => {
		const r = Math.floor(100 + Math.random() * 155).toString(16)
		const color = `#${r}aa${r}`
		return color
	},
	getSideColor: () => '#999999',
	getFillOpacity: () => 1.0,
	transparent: false,
	getThickness: () => 100000,
	enableExtrude: true,
	baseAlt: 0,
	depthTest: true,
	pickable: false,
	// hoverColor: false,
	// selectColor: false,
	hoverLineWidth: 1,
	selectLineWidth: 4,
	selectLinesHeight: 0,
	workersCount: 4,
})
fetch('https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/simple/amap/China_Fill_25.json')
	.then((r) => r.json())
	.then((geojson) => {
		polygonLayer.updateData(geojson)
		p.setStatesCode('1|104.962825|35.065100|0.000000|0.66540|0.09000|3.53000')
	})

p.add(flyline)
p.add(polygonLayer)

window['p'] = p
window['layer'] = flyline
