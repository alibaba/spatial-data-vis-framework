import { Coordinator } from '../src'
import {
	Projection,
	GeocentricProjection,
	EquirectangularProjection,
	EquirectangularProjectionPDC,
	AzimuthalEquidistantProjection,
	GallStereoGraphicProjection,
	SphereProjection,
	MercatorProjection,
} from '@polaris.gl/projection'

import { Vector3, Matrix4 } from '@gs.i/utils-math'

await test(true, '1', async () => {
	const parentP = new MercatorProjection({ center: [0, 0] })
	const selfP = new MercatorProjection({ center: [10, 10] })
	console.log(Coordinator.getRelativeMatrix(parentP, parentP))
})

await test(true, '2', async () => {
	const parentP = new MercatorProjection({ center: [0, 0] })
	const selfP = new MercatorProjection({
		center: [Math.random() * 360 - 180, Math.random() * 180 - 90],
	})
	const mat = Coordinator.getRelativeMatrix(parentP, selfP)

	const testLL = [Math.random() * 360 - 180, Math.random() * 180 - 90, 0] as const
	const posInParent = parentP.project(...testLL)
	const posInSelf = selfP.project(...testLL)
	console.log('testLL', testLL)
	console.log('posInParent', posInParent)
	console.log('posInSelf', posInSelf)
	console.log('mat', mat)
	const transformedPos = new Vector3(...posInSelf)
		.applyMatrix4(new Matrix4().fromArray(mat as number[]))
		.toArray()
	console.log('transformedPos', transformedPos)
	console.log('coincide', isEqual(posInParent, transformedPos))
})

await test(true, '3', async () => {
	const parentP = new SphereProjection({
		center: [Math.random() * 360 - 180, Math.random() * 180 - 90],
	})
	const selfP = new SphereProjection({
		center: [Math.random() * 360 - 180, Math.random() * 180 - 90],
	})
	const mat = Coordinator.getRelativeMatrix(parentP, selfP)

	const testLL = [Math.random() * 360 - 180, Math.random() * 180 - 90, 0] as const
	const posInParent = parentP.project(...testLL)
	const posInSelf = selfP.project(...testLL)
	console.log('testLL', testLL)
	console.log('posInParent', posInParent)
	console.log('posInSelf', posInSelf)
	console.log('mat', mat)
	const transformedPos = new Vector3(...posInSelf)
		.applyMatrix4(new Matrix4().fromArray(mat as number[]))
		.toArray()
	console.log('transformedPos', transformedPos)
	console.log('coincide', isEqual(posInParent, transformedPos))
})

await test(true, '3.Geocentric', async () => {
	const parentP = new GeocentricProjection({})
	const selfP = new SphereProjection({
		center: [Math.random() * 360 - 180, Math.random() * 180 - 90],
	})
	const mat = Coordinator.getRelativeMatrix(parentP, selfP)

	const testLL = [Math.random() * 360 - 180, Math.random() * 180 - 90, 0] as const
	const posInParent = parentP.project(...testLL)
	const posInSelf = selfP.project(...testLL)
	console.log('testLL', testLL)
	console.log('posInParent', posInParent)
	console.log('posInSelf', posInSelf)
	console.log('mat', mat)
	const transformedPos = new Vector3(...posInSelf)
		.applyMatrix4(new Matrix4().fromArray(mat as number[]))
		.toArray()
	console.log('transformedPos', transformedPos)
	console.log('coincide', isEqual(posInParent, transformedPos))
})

await test(true, '4', async () => {
	const parentP = new MercatorProjection({
		center: [Math.random() * 360 - 180, Math.random() * 180 - 90],
	})
	const selfP = new SphereProjection({
		center: [Math.random() * 360 - 180, Math.random() * 180 - 90],
	})

	const visualCenter = [Math.random() * 360 - 180, Math.random() * 180 - 90] as const
	const mat = Coordinator.getRelativeMatrix(parentP, selfP, visualCenter)

	await test(true, 'visualCenter', async () => {
		const testLL = [...visualCenter, Math.random() * 1000] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('coincide', isEqual(posInParent, transformedPos))
	})

	await test(true, 'nearByPoint(+0.1,+0.1)', async () => {
		const testLL = [visualCenter[0] + 0.1, visualCenter[1] + 0.1, 0] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('error distance', getDistance(posInParent, transformedPos))
	})
	await test(true, 'nearByPoint(+1,+1)', async () => {
		const testLL = [visualCenter[0] + 1, visualCenter[1] + 1, 0] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('error distance', getDistance(posInParent, transformedPos))
	})
	await test(true, 'nearByPoint(+10,+10)', async () => {
		const testLL = [visualCenter[0] + 10, visualCenter[1] + 10, 0] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('error distance', getDistance(posInParent, transformedPos))
	})
	await test(true, 'nearByPoint(-10,+10)', async () => {
		const testLL = [visualCenter[0] - 10, visualCenter[1] + 10, 0] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('error distance', getDistance(posInParent, transformedPos))
	})
})

await test(true, '5', async () => {
	const parentP = new SphereProjection({
		center: [Math.random() * 360 - 180, Math.random() * 180 - 90],
	})
	const selfP = new MercatorProjection({
		center: [Math.random() * 360 - 180, Math.random() * 180 - 90],
	})

	const visualCenter = [Math.random() * 360 - 180, Math.random() * 180 - 90] as const
	const mat = Coordinator.getRelativeMatrix(parentP, selfP, visualCenter)

	await test(true, 'visualCenter', async () => {
		const testLL = [...visualCenter, Math.random() * 1000] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('coincide', isEqual(posInParent, transformedPos))
	})

	await test(true, 'nearByPoint(+0.1,+0.1)', async () => {
		const testLL = [visualCenter[0] + 0.1, visualCenter[1] + 0.1, 0] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('error distance', getDistance(posInParent, transformedPos))
	})
	await test(true, 'nearByPoint(+1,+1)', async () => {
		const testLL = [visualCenter[0] + 1, visualCenter[1] + 1, 0] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('error distance', getDistance(posInParent, transformedPos))
	})
	await test(true, 'nearByPoint(+10,+10)', async () => {
		const testLL = [visualCenter[0] + 10, visualCenter[1] + 10, 0] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('error distance', getDistance(posInParent, transformedPos))
	})
	await test(true, 'nearByPoint(-10,+10)', async () => {
		const testLL = [visualCenter[0] - 10, visualCenter[1] + 10, 0] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('error distance', getDistance(posInParent, transformedPos))
	})
})
await test(true, '4.Geocentric-to-Planer', async () => {
	const parentP = new MercatorProjection({
		center: [Math.random() * 360 - 180, Math.random() * 180 - 90],
	})
	const selfP = new GeocentricProjection({})

	const visualCenter = [Math.random() * 360 - 180, Math.random() * 180 - 90] as const
	const mat = Coordinator.getRelativeMatrix(parentP, selfP, visualCenter)

	await test(true, 'visualCenter', async () => {
		const testLL = [...visualCenter, Math.random() * 1000] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('coincide', isEqual(posInParent, transformedPos))
	})

	await test(true, 'nearByPoint(+0.1,+0.1)', async () => {
		const testLL = [visualCenter[0] + 0.1, visualCenter[1] + 0.1, 0] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('error distance', getDistance(posInParent, transformedPos))
	})
	await test(true, 'nearByPoint(+1,+1)', async () => {
		const testLL = [visualCenter[0] + 1, visualCenter[1] + 1, 0] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('error distance', getDistance(posInParent, transformedPos))
	})
	await test(true, 'nearByPoint(+10,+10)', async () => {
		const testLL = [visualCenter[0] + 10, visualCenter[1] + 10, 0] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('error distance', getDistance(posInParent, transformedPos))
	})
	await test(true, 'nearByPoint(-10,+10)', async () => {
		const testLL = [visualCenter[0] - 10, visualCenter[1] + 10, 0] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('error distance', getDistance(posInParent, transformedPos))
	})
})
await test(true, '5.Planer-to-Geocentric', async () => {
	const parentP = new GeocentricProjection({})
	const selfP = new MercatorProjection({
		center: [Math.random() * 360 - 180, Math.random() * 180 - 90],
	})

	const visualCenter = [Math.random() * 360 - 180, Math.random() * 180 - 90] as const
	const mat = Coordinator.getRelativeMatrix(parentP, selfP, visualCenter)

	await test(true, 'visualCenter', async () => {
		const testLL = [...visualCenter, Math.random() * 1000] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('coincide', isEqual(posInParent, transformedPos))
	})

	await test(true, 'nearByPoint(+0.1,+0.1)', async () => {
		const testLL = [visualCenter[0] + 0.1, visualCenter[1] + 0.1, 0] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('error distance', getDistance(posInParent, transformedPos))
	})
	await test(true, 'nearByPoint(+1,+1)', async () => {
		const testLL = [visualCenter[0] + 1, visualCenter[1] + 1, 0] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('error distance', getDistance(posInParent, transformedPos))
	})
	await test(true, 'nearByPoint(+10,+10)', async () => {
		const testLL = [visualCenter[0] + 10, visualCenter[1] + 10, 0] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('error distance', getDistance(posInParent, transformedPos))
	})
	await test(true, 'nearByPoint(-10,+10)', async () => {
		const testLL = [visualCenter[0] - 10, visualCenter[1] + 10, 0] as const
		const posInParent = parentP.project(...testLL)
		const posInSelf = selfP.project(...testLL)
		console.log('visualCenter', visualCenter)
		console.log('testLL', testLL)
		console.log('posInParent', posInParent)
		console.log('posInSelf', posInSelf)
		console.log('mat', mat)
		const transformedPos = new Vector3(...posInSelf)
			.applyMatrix4(new Matrix4().fromArray(mat as number[]))
			.toArray()
		console.log('transformedPos', transformedPos)
		console.log('error distance', getDistance(posInParent, transformedPos))
	})
})

globalThis.sp = new SphereProjection({ center: [0, 0, 0] })

// ===

async function test(enable: boolean, name: string, fun: () => void, duration = 100) {
	if (!enable) return
	// console.group(name)
	console.groupCollapsed(name)
	await fun()
	await new Promise((resolve, reject) => {
		setTimeout(() => resolve(true), duration)
	})
	// console.log(`test end (${name})`)
	console.groupEnd()
	return
}

function isEqual(a: number[], b: number[]) {
	if (a.length !== b.length) return false

	// let manhattanDistance = 0
	for (let i = 0; i < a.length; i++) {
		// manhattanDistance += Math.abs(a[i] - b[i])
		if (Math.abs(a[i] - b[i]) > 0.0001 /* 0.01 mm */) {
			return false
		}
	}

	// console.debug('alignment error distance', manhattanDistance)

	return true
}
function getDistance(a: number[], b: number[]) {
	if (a.length !== b.length) throw new Error('arrays must have the same length')

	let distance = 0
	for (let i = 0; i < a.length; i++) {
		distance += Math.pow(a[i] - b[i], 2)
	}

	return Math.sqrt(distance)

	// let manhattanDistance = 0
	// for (let i = 0; i < a.length; i++) {
	// 	manhattanDistance += Math.abs(a[i] - b[i])
	// }

	// return manhattanDistance
}
