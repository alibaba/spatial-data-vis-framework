import { buildSphere } from '@gs.i/utils-geom-builders'
import * as SDK from '@gs.i/frontend-sdk'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { HelperLayer } from '@polaris.gl/layer-std-helper'

const container = document.querySelector('#container') as HTMLDivElement
const p = new PolarisGSIGL2({
	container: container,
	width: 500,
	height: 500,
	// ratio: 0.5,
	antialias: 'msaa',

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
	},
})

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

//
setTimeout(() => {
	console.log('Update props')
	p.updateProps({
		lights: {
			ambientLight: {
				color: '#223322',
				intensity: 0.5,
			},
			directionalLights: [
				{
					color: '#ffffff',
					intensity: 0.5,
					position: { x: 1, y: -1, z: 1 },
				},
			],
			pointLights: [
				{
					color: '#ffffff',
					intensity: 2,
					position: { x: -2000, y: 2000, z: 2000 },
					range: 1000000,
				},
			],
		},
		postprocessing: [
			{
				name: 'Bloom',
				props: { intensity: 3 },
			},
		],
	})
}, 2000)

window['container'] = container
window['p'] = p
window['layer'] = layer
