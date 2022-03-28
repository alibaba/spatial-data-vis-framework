import { StandardLayer } from '@polaris.gl/gsi'
import { PolarisLite } from '@polaris.gl/lite'

import { generateScene } from '@gs.i/utils-random-scene'
import { IndicatorProcessor } from '@gs.i/processor-indicator'
import { HelperLayer } from '@polaris.gl/layer-std-helper'
import { LodLineStringLayer, PolygonLayer } from '@polaris.gl/layer-geojson'

const indicator = new IndicatorProcessor({
	useWireframe: true,
	useBBox: true,
})

const container = document.querySelector('#container') as HTMLDivElement
const p = new PolarisLite({
	container,
	// background: 'transparent',
	// autoplay: false,
	autoResize: true,
})

// let n = 0
// setInterval(() => {
// 	n++
// 	p.resize(500 + 300 * Math.sin(n / 10), 500 + 300 * Math.sin(n / 10))
// 	console.log('resize')
// }, 100)

// p.addEventListener('tickError', (e) => {
// 	// debugger
// 	// throw e.error // 这样 throw 会丢失调用栈
// })
const h = new HelperLayer({ length: 10000 })
p.add(h)
h.setProps({ box: false })

// p.addEventListener('viewChange', (e) => {
// 	console.log(e)
// })
globalThis.p = p
console.log(p)

// const scene = generateScene({
// 	// scale: 1000,
// 	count: 10,
// 	depth: 10,
// 	useAnimation: true,
// 	useSprite: true,
// 	usePoint: false,
// 	resolution: [500, 500],
// })
// console.log(scene)

// // const indicator = new IndicatorProcessor({
// // 	// hideOriginal: true,
// // 	useBBox: true,
// // 	useBSphere: true,
// // 	// useWireframe: true,
// // })
// // indicator.traverse(scene)

// const l = new StandardLayer({})
// l.view.gsi.group.add(scene)

// p.add(l)

async function fetchData() {
	const data: any[] = []

	const response = await fetch(
		'https://gw.alipayobjects.com/os/bmw-prod/69f76d0b-8758-49cc-86e7-6fc5728cb3ea.json' // geojson china all
	)
	const json = await response.json()
	data.push(json)

	return data
}

const data = await fetchData()

const geojson = data[0]
const newGeo = { ...geojson, features: [] }

console.log('newGeo', newGeo)

geojson.features.forEach((feature) => {
	const level = feature.properties.level
	const adcode = feature.properties.adcode
	if (adcode === '100000') {
		return
	}
	if (level === 'province') {
		newGeo.features.push(Object.assign({}, feature))
		return
	}
})

// Polygons
const polygonLayer1 = (window['layer1'] = new PolygonLayer({
	// projection: new SphereProjection({}),
	getFillColor: (feature) => {
		// const r = Math.floor(Math.random() * 255).toString(16)
		// const color = `#${r}66${r}`
		// return color
		return Math.round(Math.random() * 0xffffff)
	},
	getSideColor: () => '#999999',
	getFillOpacity: () => 1.0,
	transparent: false,
	getThickness: () => 100000,
	enableExtrude: true,
	baseAlt: 0,
	depthTest: true,
	pickable: true,
	selectColor: undefined, // '#ff0099',
	hoverColor: undefined, // '#6600ff',
	selectLinesHeight: 0,
	selectLineLevel: 2 as 1 | 2 | 4,
	selectLineWidth: 4,
	selectLineColor: '#FFAE0F',
	hoverLineLevel: 2 as 1 | 2 | 4,
	hoverLineWidth: 2,
	hoverLineColor: '#262626',
	workersCount: 4,
}))
p.add(polygonLayer1)

await Promise.resolve()

polygonLayer1.updateData(newGeo)

const picked = new Set<number>()
polygonLayer1.addEventListener('hover', (event) => {})
polygonLayer1.addEventListener('pick', (event) => {
	const info = event.result
	console.log('pick', info)
	console.log('feature', info?.data?.feature)
	if (info && info.data && info.data.feature) {
		const index = info.index
		polygonLayer1.highlightByIndices([index], { type: 'select' })
		picked.add(index)
	} else {
		picked.forEach((index) => polygonLayer1.highlightByIndices([index], { type: 'none' }))
	}
})

// console.log('polygonLayer1', polygonLayer1)
// indicator.traverse(polygonLayer1.sideLayer.mesh)
// indicator.traverse(polygonLayer1.surfaceLayer.mesh)

// line
const lineLayer2 = (window['line'] = new LodLineStringLayer({
	color: '#ffffff',
	lineWidth: 2,
	baseAlt: 0,
	lods: [
		{
			zoom: 3,
			percentage: 0.2,
		},
		{
			zoom: 6,
			percentage: 0.6,
		},
		{
			zoom: 10,
			percentage: 1.0,
		},
	],
	data: await (
		await fetch(
			'https://gw.alipayobjects.com/os/bmw-prod/a67af908-f9a4-44c6-8912-ddd45bcb56c0.json'
		)
	).json(),
	debug: true, // Debug mode, with color variance
}))
p.add(lineLayer2)

const polygonLayer2 = (window['layer2'] = new PolygonLayer({
	getFillColor: (feature) => {
		// const r = Math.floor(Math.random() * 255).toString(16)
		// const color = `#${r}66${r}`
		// return color
		return Math.round(Math.random() * 0xffffff)
	},
	getFillOpacity: () => 1.0,
	getSideColor: () => '#999999',
	sideOpacity: 1.0,
	getThickness: () => 0,
	enableExtrude: false,
	baseAlt: 0,
	depthTest: true,
	// pickable: true,
	// workersCount: 8,
	// projection: new SphereProjection({}),
	workersCount: 0,
}))

// ATTENTION 这里如果把 add 放在 data fetch 之后，就可以渲染
p.add(polygonLayer2)

const data2 = await (
	await fetch('https://gw.alipayobjects.com/os/bmw-prod/6a0e53c5-3d79-407f-a554-2f97916f7940.json')
).json()

polygonLayer2.updateData(data2)
// polygonLayer2.onPicked = (info) => {
// 	console.log('onPicked', info)
// 	if (info && info.data && info.data.feature) {
// 		const feature = info.data.feature
// 		const index = feature.index
// 		// polygonLayer2.highlightByIndices([index], { type: 'select' })
// 	}
// }

console.log('polygonLayer2', polygonLayer2)

p.setStatesCode('1|-1.191044|56.161481|0.000000|0.70540|-0.03000|1.73000')
// p.setStatesCode('1|110|36|0.000000|0.00000|0.00000|1.73000')
