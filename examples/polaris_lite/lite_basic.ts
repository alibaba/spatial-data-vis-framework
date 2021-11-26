import { HelperLayer } from '@polaris.gl/layer-std-helper'
import { buildSphere } from '@gs.i/utils-geom-builders'
import * as SDK from '@gs.i/frontend-sdk'
import { PolarisLite } from '@polaris.gl/lite'

const container = document.querySelector('#container') as HTMLDivElement
const p = new PolarisLite({
	container: container,
	width: 500,
	height: 500,
	ratio: 1.0,
	antialias: false,
	background: '#000',
	lights: {
		ambientLight: {
			intensity: 1,
		},
		directionalLights: [
			{
				color: '#ffffff',
				intensity: 2,
				position: { x: 1, y: 1, z: 1 },
			},
			{
				color: '#ffffff',
				intensity: 1,
				position: { x: -1, y: -1, z: 1 },
			},
		],
		pointLights: [
			{
				intensity: 1,
				position: { x: 0, y: 1200, z: 1200 },
			},
		],
	},
	debug: true,
})
p.timeline.config.ignoreErrors = false

const layer = new HelperLayer({ box: false })
p.add(layer)

//
const sphere = new SDK.Mesh({
	geometry: buildSphere({ radius: 1000, widthSegments: 40, heightSegments: 20, normal: true }),
	material: new SDK.MatrPbr({
		baseColorFactor: { r: 0, g: 1, b: 1 },
		metallicFactor: 0.7,
		roughnessFactor: 0.1,
	}),
})
p.view.gsi.group.add(sphere)

window['container'] = container
window['p'] = p
window['layer'] = layer
window['mesh'] = sphere
