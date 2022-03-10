import { StandardLayer } from '@polaris.gl/base-gsi'
import { PolarisLite } from '@polaris.gl/lite'

import { generateScene } from '@gs.i/utils-random-scene'
import { IndicatorProcessor } from '@gs.i/processor-indicator'
import { HelperLayer } from '@polaris.gl/layer-std-helper'
import { LodLineStringLayer, PolygonLayer } from '@polaris.gl/layer-geojson'
import { FlyLineLayer, FlyLine } from '@polaris.gl/layer-flyline'
import { ScatterLayer } from '@polaris.gl/layer-scatter'

const p = new PolarisLite({
	container: document.querySelector('#container') as HTMLDivElement,
	// background: 'transparent',
	// autoplay: false,
})
const h = new HelperLayer({ parent: p, length: 10000 })
h.setProps({ box: false })
globalThis.p = p
console.log(p)

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
p.add(scatterLayer)
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
globalThis.s = scatterLayer

p.setStatesCode('1|104.962825|35.065100|0.000000|0.66540|0.09000|3.53000')
