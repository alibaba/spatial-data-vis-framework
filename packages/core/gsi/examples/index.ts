import { StandardLayer } from '../src/layer/StandardLayer'
import { PolarisGSI } from '../src/polaris/PolarisGSI'

await test(true, 'StandardLayer', () => {
	const d = new StandardLayer({})
	console.log(d)
})

await test(true, 'PolarisGSI', () => {
	const d = new PolarisGSI({
		container: document.querySelector('#container') as HTMLDivElement,
		autoplay: false,
	})
	console.log(d)
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
