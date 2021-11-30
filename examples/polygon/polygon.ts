import { SphereProjection } from '@polaris.gl/projection'
import { PolygonLayer, LineStringLayer, LodLineStringLayer } from '@polaris.gl/layer-geojson'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { HelperLayer } from '@polaris.gl/layer-std-helper'

const p = new PolarisGSIGL2({
	container: document.querySelector('#container') as HTMLDivElement,
	width: 800,
	height: 800,
	lights: {},
	autoResize: true,
})
p.timeline.config.ignoreErrors = false

p.add(new HelperLayer({ length: 10000, box: false }))

async function fetchData() {
	const data: any[] = []

	const response = await fetch(
		'https://gw.alipayobjects.com/os/bmw-prod/69f76d0b-8758-49cc-86e7-6fc5728cb3ea.json' // geojson china all
	)
	const json = await response.json()
	data.push(json)

	return data
}

fetchData().then((data) => {
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
			const r = Math.floor(100 + Math.random() * 155).toString(16)
			const color = `#${r}aa${r}`
			return color
		},
		getSideColor: '#999999',
		getFillOpacity: 1.0,
		transparent: false,
		getThickness: 100000,
		enableExtrude: true,
		baseAlt: 0,
		depthTest: true,
		pickable: true,
		hoverColor: false,
		selectColor: false,
		hoverLineWidth: 1,
		selectLineWidth: 4,
		selectLinesHeight: 2000,
		workersCount: 4,
	}))
	p.add(polygonLayer1)
	polygonLayer1.updateData(newGeo)
	polygonLayer1.onPicked = (info) => {
		console.log('onPicked', info)
	}
	polygonLayer1.onHovered = (info) => {}

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
		data: 'https://gw.alipayobjects.com/os/bmw-prod/a67af908-f9a4-44c6-8912-ddd45bcb56c0.json',
		debug: true, // Debug mode, with color variance
	}))
	p.add(lineLayer2)
})

const polygonLayer2 = (window['layer2'] = new PolygonLayer({
	getFillColor: (feature) => {
		return Math.random() * 0xffffff
	},
	getFillOpacity: 1.0,
	getSideColor: '#999999',
	sideOpacity: 1.0,
	getThickness: 0,
	enableExtrude: false,
	baseAlt: 0,
	depthTest: true,
	pickable: true,
	// workersCount: 8,
	// projection: new SphereProjection({}),
}))
p.add(polygonLayer2)
polygonLayer2.updateData(
	'https://gw.alipayobjects.com/os/bmw-prod/6a0e53c5-3d79-407f-a554-2f97916f7940.json'
)
polygonLayer2.onPicked = (info) => {
	console.log('onPicked', info)
}
// polygonLayer2.onHovered = (info) => {
// 	info && console.log('onHovered', info)
// }

p.setStatesCode('1|-1.191044|56.161481|0.000000|0.70540|-0.03000|1.73000')
// p.setStatesCode('1|110|36|0.000000|0.00000|0.00000|1.73000')

//

window['p'] = p
