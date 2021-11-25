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
		'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/all.json' // geojson china all
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
		// projection: new SphereProjection({}),
	}))
	p.add(polygonLayer1)
	polygonLayer1.updateData(newGeo)
	polygonLayer1.onPicked = (info) => {
		console.log('onPicked', info)
	}
	polygonLayer1.onHovered = (info) => {
		// console.log('onHovered', info)
	}

	// Line
	// const lineLayer = (window['line'] = new LineStringLayer({
	// 	color: '#ffffff',
	// 	lineWidth: 1,
	// 	baseAlt: 0,
	// 	texture: undefined,
	// 	data: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/world-coastline.json',
	// }))
	// p.add(lineLayer)

	const lineLayer2 = (window['line'] = new LodLineStringLayer({
		color: '#ffffff',
		lineWidth: 1,
		baseAlt: 0,
		lodZoomLvs: [3, 5, 7, 9, 11],
		lodPercentages: [0.1, 0.3, 0.5, 0.7, 1.0],
		data: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/world-coastline.json',
		debug: true,
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
	'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/examples/country_unemployment_from_kepler.geojson'
)
// polygonLayer2.onPicked = (info) => {
// 	console.log('onPicked', info)
// }
polygonLayer2.onHovered = (info) => {
	info && console.log('onHovered', info)
}

p.setStatesCode('1|-1.191044|56.161481|0.000000|0.70540|-0.03000|1.73000')
// p.setStatesCode('1|110|36|0.000000|0.00000|0.00000|1.73000')

//

window['p'] = p
