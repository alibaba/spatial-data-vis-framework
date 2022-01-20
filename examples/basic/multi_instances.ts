import { HelperLayer } from '@polaris.gl/layer-std-helper'
import { buildSphere } from '@gs.i/utils-geom-builders'
import * as SDK from '@gs.i/frontend-sdk'
// import { PolarisGSIGL2 as Polaris } from '@polaris.gl/gsi-gl2'
import { PolarisLite as Polaris } from '@polaris.gl/lite'
import { genBSphereWireframe, genBBoxWireframe } from '@gs.i/utils-geometry'
import { BSphere, BBox } from '@gs.i/schema'

const width = 250
const height = 250
const count = 18
const containers: any[] = []
const main = document.querySelector('#container') as HTMLDivElement
for (let i = 0; i < count; i++) {
	const container = document.createElement('div')
	container.id = 'container-' + i
	container.style.position = 'absolute'
	container.style.width = width + 'px'
	container.style.height = height + 'px'
	container.style.background = '#' + Math.round(Math.random() * 0xffffff).toString(16)
	container.style.left = (i % 2) * width + 'px'
	container.style.top = Math.floor(i / 2) * height + 'px'
	main.appendChild(container)
	containers.push(container)
}

const instances: any[] = []
const meshes: any[] = []
containers.forEach((container, index) => {
	const p = new Polaris({
		container: container,
		width: width,
		height: height,
		ratio: 1.0,
		antialias: false,
		background: 'transparent',
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
	// p.timeline._config.onError = (e) => throw e
	instances.push(p)

	const layer = new HelperLayer({ box: true })
	layer.name = index + ''
	if (layer.box && layer.box.geometry) {
		layer.box.name = index + ''
		meshes.push(layer.box)

		const wireframe1 = genBSphereWireframe(layer.box.geometry.boundingSphere as BSphere)
		p.view.gsi.group.add(
			new SDK.Mesh({
				geometry: wireframe1,
				material: new SDK.MatrUnlit(),
			})
		)
	}

	p.add(layer)

	p.setStatesCode(
		`1|0.000000|0.000000|0.000000|${Math.random() * Math.PI * 2}|${Math.random() * Math.PI}|${
			Math.random() * 5 + 10
		}`
	)
})

window['p'] = instances
window['meshes'] = meshes
