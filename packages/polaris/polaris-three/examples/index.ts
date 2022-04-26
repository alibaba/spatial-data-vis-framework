import { StandardLayer } from '@polaris.gl/gsi'
import { PolarisThree } from '../src/index'

import { Reflector } from '../src/renderer/Reflector'

import { generateScene } from '@gs.i/utils-random-scene'
import { IndicatorProcessor } from '@gs.i/processor-indicator'

import * as THREE from 'three'

await test(true, 'PolarisThree', () => {
	const p = new PolarisThree({
		container: document.querySelector('#container') as HTMLDivElement,
		background: 'transparent',
		// autoplay: false,
	})

	p.setStatesCode('1|0.000000|0.000000|0.000000|0.74540|0.84000|17.77600')

	// p.addEventListener('viewChange', (e) => {
	// 	console.log(e)
	// })
	globalThis.p = p
	console.log(p)

	const scene = generateScene({
		// scale: 1000,
		count: 10,
		depth: 10,
		useAnimation: true,
		useSprite: true,
		usePoint: false,
		resolution: [500, 500],
	})
	console.log(scene)

	const indicator = new IndicatorProcessor({
		// hideOriginal: true,
		useBBox: true,
		useBSphere: true,
		// useWireframe: true,
	})
	// indicator.traverse(scene)

	const l = new StandardLayer({})
	l.view.gsi.group.add(scene)

	p.add(l)

	const r = new Reflector(new THREE.PlaneGeometry(500, 500), { multisample: 8 })

	// r.rotation.x = 1
	r.position.x = -100
	r.updateMatrixWorld()

	p.renderer['scene'].add(r)
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
