import { StandardLayer } from '@polaris.gl/gsi'
import { PolarisLite } from '@polaris.gl/lite'
import { PolarisThree } from '@polaris.gl/three'

import { generateScene } from '@gs.i/utils-random-scene'
import { IndicatorProcessor } from '@gs.i/processor-indicator'
import { HelperLayer } from '@polaris.gl/layer-std-helper'

const createLiteAndDispose = async () => {
	const p = new PolarisLite({
		container: document.querySelector('#container') as HTMLDivElement,
		background: 'transparent',
	})

	const h = new HelperLayer()
	p.add(h)
	h.setProps({ box: false })

	const scene = generateScene({
		// scale: 1000,
		count: 10,
		depth: 10,
		useAnimation: true,
		useSprite: true,
		usePoint: false,
		resolution: [500, 500],
	})

	const l = new StandardLayer({})
	l.view.gsi.group.add(scene)

	p.add(l)

	l.addEventListener('dispose', () => {
		console.log('layer dispose')
		// generateScene 中的动画使用 interval 实现，需要这样清除来避免内存溢出
		scene.extras.intervalIDs.forEach((id) => clearInterval(id))
	})
	p.addEventListener('dispose', () => console.log('polaris dispose'))

	setTimeout(() => p.dispose(), 1000)
}
const createThreeAndDispose = async () => {
	const p = new PolarisThree({
		container: document.querySelector('#container') as HTMLDivElement,
		background: 'transparent',
	})

	const h = new HelperLayer()
	p.add(h)
	h.setProps({ box: false })

	const scene = generateScene({
		// scale: 1000,
		count: 10,
		depth: 10,
		useAnimation: true,
		useSprite: true,
		usePoint: false,
		resolution: [500, 500],
	})

	const l = new StandardLayer({})
	l.view.gsi.group.add(scene)

	p.add(l)

	l.addEventListener('dispose', () => {
		console.log('layer dispose')
		// generateScene 中的动画使用 interval 实现，需要这样清除来避免内存溢出
		scene.extras.intervalIDs.forEach((id) => clearInterval(id))
	})
	p.addEventListener('dispose', () => console.log('polaris dispose'))

	setTimeout(() => p.dispose(), 1000)
}

console.group('test polaris lite')

for (let i = 0; i < 20; i++) {
	await test(true, 'createLiteAndDispose', createLiteAndDispose)
}

console.groupEnd()

console.group('test polaris three')

for (let i = 0; i < 20; i++) {
	await test(true, 'createThreeAndDispose', createThreeAndDispose)
}

console.groupEnd()

// ===

async function test(
	enable: boolean,
	name: string,
	fun: () => void | Promise<void>,
	duration = 1000
) {
	if (!enable) return
	console.group(name)
	await fun()
	await new Promise((resolve, reject) => {
		setTimeout(() => resolve(true), duration)
	})
	console.log(`test end (${name})`)
	console.groupEnd()
	return
}
