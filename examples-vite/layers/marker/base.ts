import IR, { isRenderable } from '@gs.i/schema-scene'
import { Mesh, Geom, PbrMaterial } from '@gs.i/frontend-sdk'
import { buildCylinder } from '@gs.i/utils-geom-builders'
import { StandardLayer } from '@polaris.gl/gsi'
import { PolarisLite } from '@polaris.gl/lite'

import { generateScene } from '@gs.i/utils-random-scene'
import { IndicatorProcessor } from '@gs.i/processor-indicator'
import { HelperLayer } from '@polaris.gl/layer-std-helper'

import { MarkerLayer, Marker } from '@polaris.gl/layer-std-marker'
import { traverseBFS } from '@gs.i/utils-traverse'

await test(true, 'PolarisLite', () => {
	const p = new PolarisLite({
		container: document.querySelector('#container') as HTMLDivElement,
		background: 'transparent',
		// autoplay: false,
	})

	const h = new HelperLayer()
	p.add(h)
	h.setProps({ box: false })

	// p.addEventListener('viewChange', (e) => {
	// 	console.log(e)
	// })
	globalThis.p = p
	console.log(p)

	const div = document.createElement('div')
	div.style.backgroundColor = 'pink'
	div.innerText = 'hoho'

	const markerLayer = new MarkerLayer({
		pickable: true,
		recursivePicking: true,
		data: [
			{ html: 'hahaha', lng: 0, lat: 0 },
			{ html: div, lng: 0.01, lat: 0 },
			{
				object3d: generateScene({
					// scale: 1000,
					count: 10,
					depth: 10,
					useAnimation: true,
					useSprite: true,
					usePoint: false,
					resolution: [500, 500],
				}),
				lng: 0.01,
				lat: 0.01,
			},
			{
				object3d: generateScene({
					// scale: 1000,
					count: 10,
					depth: 10,
					useAnimation: true,
					useSprite: true,
					usePoint: false,
					resolution: [500, 500],
				}),
				lng: -0.01,
				lat: 0.01,
			},
			// {
			// 	object3d: new Mesh({
			// 		name: 'cylinder',
			// 		geometry: generateCylinder(),
			// 		material: new PbrMaterial({
			// 			baseColorFactor: { r: 1, g: 0.5, b: 0.5 },
			// 		}),
			// 	}),
			// 	lng: 0,
			// 	lat: 0,
			// 	alt: 300,
			// },
		],
	})
	p.add(markerLayer)

	setAttrsDisposableFalseRecur(markerLayer)

	console.log(markerLayer)

	// const marker = new Marker({ html: 'hahaha' })
	// markerLayer.add(marker)
	// console.log(marker)

	// const marker2 = new Marker({ html: 'hoho', lng: 0.01 })
	// markerLayer.add(marker2)

	// const marker3 = new Marker({
	// 	object3d: generateScene({
	// 		// scale: 1000,
	// 		count: 10,
	// 		depth: 10,
	// 		useAnimation: true,
	// 		useSprite: true,
	// 		usePoint: false,
	// 		resolution: [500, 500],
	// 	}),
	// 	lng: 0.01,
	// 	lat: 0.01,
	// })
	// markerLayer.add(marker3)

	// const marker4 = new Marker({
	// 	object3d: generateScene({
	// 		// scale: 1000,
	// 		count: 10,
	// 		depth: 10,
	// 		useAnimation: true,
	// 		useSprite: true,
	// 		usePoint: false,
	// 		resolution: [500, 500],
	// 	}),
	// 	lng: -0.01,
	// 	lat: 0.01,
	// })
	// markerLayer.add(marker4)

	// const indicator = new IndicatorProcessor({
	// 	// hideOriginal: true,
	// 	useBBox: true,
	// 	useBSphere: true,
	// 	// useWireframe: true,
	// })
	// indicator.traverse(scene)

	// const l = new StandardLayer({})
	// l.view.gsi.group.add(scene)

	// p.add(l)

	markerLayer.addEventListener('pick', (e) => {
		if (e.result) {
			console.log('hit', e)
		} else {
			console.log('not hit', e)
		}
	})
})

function generateCylinder() {
	const cylinder = new Geom(
		buildCylinder({
			radiusTop: 300,
			radiusBottom: 50,
			height: 1000,
			normal: true,
			uv: true,
		})
	)
	for (const key in cylinder.attributes) {
		if (Object.prototype.hasOwnProperty.call(cylinder.attributes, key)) {
			const attr = cylinder.attributes[key]
			attr && (attr.disposable = false)
		}
	}
	cylinder.indices && (cylinder.indices.disposable = false)
	return cylinder
}

function setAttrsDisposableFalseRecur(markerLayer: MarkerLayer) {
	markerLayer.markers.forEach((marker) => {
		if (marker.object3d) {
			traverseBFS(marker.object3d, (node) => {
				if (isRenderable(node)) {
					for (const name in node.geometry.attributes) {
						const attr = node.geometry.attributes[name]
						attr && (attr.disposable = false)
					}
					node.geometry.indices && (node.geometry.indices.disposable = false)
				}
			})
		}
	})
}

// ===

async function test(enable: boolean, name: string, fun: () => void, duration = 1000) {
	if (!enable) return
	console.group(name)
	fun()
	await new Promise((resolve, reject) => {
		setTimeout(() => resolve(true), duration)
	})
	console.log(`test end (${name})`)
	console.groupEnd()
	return
}
