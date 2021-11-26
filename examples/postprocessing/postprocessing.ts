import { buildSphere } from '@gs.i/utils-geom-builders'
import * as SDK from '@gs.i/frontend-sdk'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { HelperLayer } from '@polaris.gl/layer-std-helper'

const container = document.querySelector('#container') as HTMLDivElement
const p = new PolarisGSIGL2({
	container: container,
	width: 1000,
	height: 1000,
	antialias: 'msaa',
	lights: {
		ambientLight: {
			intensity: 1,
		},
		directionalLights: [
			{
				color: '#ffffff',
				intensity: 1,
				position: { x: 1, y: 1, z: 1 },
			},
			{
				color: '#ffffff',
				intensity: 1,
				position: { x: 1, y: 1, z: -1 },
			},
		],
	},
	postprocessing: [
		{
			name: 'Bokeh',
			props: {
				autoFocus: true,
				autoDOF: true,
			},
		},
		{
			name: 'Bloom',
			props: {
				intensity: 2,
			},
		},
		// {
		// 	name: 'Film',
		// 	props: {},
		// },
		// {
		// 	name: 'DotScreen',
		// 	props: {},
		// },
		// {
		// 	name: 'ShockWave',
		// 	props: [
		// 		// Magic Header `_provide_` for bringing scene objs to pass
		// 		'_provide_camera',
		// 		undefined,
		// 		{
		// 			speed: 2000,
		// 			waveSize: 8000,
		// 			maxRadius: 8000,
		// 			amplitude: 8000,
		// 		},
		// 	],
		// },
	],
})
p.timeline.config.ignoreErrors = false

p.renderer.effectComposer.passes.forEach((item, i) => {
	const el = document.createElement('li')
	el.innerText = item.name
	el.style.position = 'absolute'
	el.style.left = p.width + 30 + 'px'
	el.style.top = 30 * (i + 1) + 'px'
	container.appendChild(el)
})

// ShockWave Animation
setInterval(() => {
	const swPass = p.renderer.effectComposer.passes.find((p) => p.name === 'ShockWavePass')
	if (swPass) {
		swPass.active = true
		swPass.time = 0
	}
}, 5000)

//

const layer = new HelperLayer({ box: false })
p.add(layer)

//
const geometry = buildSphere({ radius: 100, widthSegments: 40, heightSegments: 20, normal: true })
const material = new SDK.MatrPbr({
	baseColorFactor: { r: 0, g: 1, b: 1 },
	metallicFactor: 0.7,
	roughnessFactor: 0.1,
})

for (let i = 0; i < 100; i++) {
	const sphere = new SDK.Mesh({
		geometry: geometry,
		material: material,
	})
	sphere.transform.position.set(
		Math.random() * 5000 - 2500,
		Math.random() * 5000 - 2500,
		Math.random() * 1000 - 300
	)
	p.view.gsi.group.add(sphere)
}

window['p'] = p
window['layer'] = layer
