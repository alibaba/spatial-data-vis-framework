import { StandardLayer } from '@polaris.gl/gsi'
import { PolarisLite } from '@polaris.gl/lite'

import { generateScene } from '@gs.i/utils-random-scene'
import { IndicatorProcessor } from '@gs.i/processor-indicator'
import { HelperLayer } from '@polaris.gl/layer-std-helper'

import { MarkerLayer, Marker } from '@polaris.gl/layer-std-marker'

await test(true, 'PolarisLite', () => {
	const p = new PolarisLite({
		container: document.querySelector('#container') as HTMLDivElement,
		background: 'transparent',
		// autoplay: false,
	})

	const h = new HelperLayer({ parent: p })
	h.setProps({ box: false })

	// p.addEventListener('viewChange', (e) => {
	// 	console.log(e)
	// })
	globalThis.p = p
	console.log(p)

	const markerLayer = new MarkerLayer()
	p.add(markerLayer)

	const marker = new Marker({ html: 'hahaha' })
	markerLayer.add(marker)
	console.log(marker)

	const marker2 = new Marker({ html: 'hoho', lng: 0.01 })
	markerLayer.add(marker2)

	const marker3 = new Marker({
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
	})
	markerLayer.add(marker3)

	const marker4 = new Marker({
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
	})
	markerLayer.add(marker4)

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
})

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
