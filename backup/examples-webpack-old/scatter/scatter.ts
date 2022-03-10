import { ScatterLayer } from '@polaris.gl/layer-scatter'
import { PolarisGSIGL2 as Polaris } from '@polaris.gl/gsi-gl2'
// import { PolarisLite as Polaris } from '@polaris.gl/lite'
import { HelperLayer } from '@polaris.gl/layer-std-helper'
import { PolygonLayer } from '@polaris.gl/layer-geojson'
import { SphereProjection } from '@polaris.gl/projection'

const p = new Polaris({
	container: document.querySelector('#container') as HTMLDivElement,
	width: 800,
	height: 800,
	ratio: 1,
})
// p.timeline._config.onError = (e) => throw e

p.add(new HelperLayer({ length: 10000 }))

const polygonLayer = new PolygonLayer({
	// projection: new SphereProjection({}),
	getFillColor: '#689826',
	getSideColor: '#999999',
	getThickness: 0,
	enableExtrude: false,
	// opacity: 1,
	baseAlt: 0,
	// data: [],
})
fetch('https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/simple/amap/China_Fill_25.json')
	.then((r) => r.json())
	.then((geojson) => {
		polygonLayer.updateData(geojson)
		p.setStatesCode('1|104.962825|35.065100|0.000000|0.66540|0.09000|3.53000')
	})
p.add(polygonLayer)

//
const scatterLayer = new ScatterLayer({
	size: 1.5,
	opacity: 0.5,
	color: '#B900FD',
	useColors: true,
	colors: [
		// { color: '#FDC871', value: 0.2 },
		{ color: '#FF7300', value: 0.4 },
		{ color: '#C0370A', value: 0.6 },
		{ color: '#881C1C', value: 0.8 },
	],
	map: 'https://img.alicdn.com/tfs/TB1X4pmgAyWBuNjy0FpXXassXXa-64-64.png',
	enableBlending: true,
	enableShining: true,
	sizeAttenuation: false,
	shiningSpeed: 2,
	baseAlt: 0,
	renderOrder: 0,
	depthTest: false,
})
polygonLayer.add(scatterLayer)
fetch('https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/examples/scatter.json')
	.then((r) => r.json())
	.then((res) => {
		scatterLayer.updateData(
			res.data.map((d) => {
				const { lng, lat } = d
				return { lng, lat, value: Math.random() }
			})
		)
	})

window['p'] = p
window['layer'] = scatterLayer
