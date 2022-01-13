import { Mesh, MatrUnlit, Geom } from '@gs.i/frontend-sdk'
import { MarkerLayer } from '@polaris.gl/layer-std-marker'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { LineStringLayer, PolygonLayer } from '@polaris.gl/layer-geojson'
import { buildSphere, buildPlane } from '@gs.i/utils-geom-builders'
import { GeocentricProjection, SphereProjection } from '@polaris.gl/projection'
import { StandardLayer } from '@polaris.gl/layer-std'
import { Matrix4 } from '@gs.i/utils-math'
import { applyMatrixToAttr } from '@polaris.gl/utils'

const container = document.querySelector('#container') as HTMLDivElement
const p = (window['p'] = new PolarisGSIGL2({
	container,
	zoom: 3,
	pitch: 0,
	rotation: 0,
	width: 1000,
	height: 1000,
	debug: true,
}))

// Earth
const earth = new StandardLayer({
	projection: new SphereProjection({}),
})
const mesh = new Mesh({
	name: 'Earth',
	geometry: buildSphere({
		radius: 6378137,
		widthSegments: 128,
		heightSegments: 64,
		uv: true,
	}),
	material: new MatrUnlit({
		baseColorTexture: {
			image: {
				uri: 'https://img.alicdn.com/tfs/TB1pBhYRpXXXXb2XpXXXXXXXXXX-2048-1024.jpg',
				flipY: true,
			},
			sampler: {},
		},
		opacity: 0.5,
		alphaMode: 'BLEND',
	}),
})

const _m1 = new Matrix4()
const _m2 = new Matrix4()
earth.getProjection().then((projection) => {
	const geom = mesh.geometry as Geom

	_m1.makeRotationY((-1 * Math.PI) / 2)
	applyMatrixToAttr(geom.attributes['position'], _m1)
	_m2.makeTranslation(-projection['_xyz0'][0], -projection['_xyz0'][1], -projection['_xyz0'][2])
	applyMatrixToAttr(geom.attributes['position'], _m2)

	geom.boundingBox = undefined
	geom.boundingSphere = undefined

	earth.group.add(mesh)
})
p.add(earth)

// Marker objects
const markerMesh = new Mesh({
	name: 'Marker mesh',
	geometry: buildPlane({
		width: 1000000,
		height: 1000000,
		widthSegments: 1,
		heightSegments: 1,
	}),
	material: new MatrUnlit({
		baseColorFactor: { r: 1, g: 0.5, b: 0 },
		side: 'front',
	}),
})

const div = document.createElement('div')
div.style.fontSize = '12px'
div.style.background = '#00ffff'
div.style.width = '20px'
div.style.height = '20px'

// Marker data
const data: any[] = []
for (let i = 0; i < 10; i++) {
	const html = div.cloneNode() as HTMLElement
	html.style.background = `#${Math.floor(Math.random() * 0xffffff).toString(16)}`
	html.innerHTML = 'text' + i
	data.push({
		lng: Math.random() * 360,
		lat: -90 + Math.random() * 180,
		// alt: 1000000 * Math.random(),
		html: html,
		// autoHide: Math.random() > 0.5,
	})
}

data.push({
	lng: 116.46,
	lat: 39.92,
	html: `
		<img src="https://img.alicdn.com/imgextra/i2/O1CN01NZrfhA1F6BkSzra3t_!!6000000000437-1-tps-400-300.gif" width="32" height="32">
		<a>BEIJING</a>
	`,
})

const markerLayer = new MarkerLayer({
	html: '222',
	style: {
		color: '#ffffff',
	},
	object3d: markerMesh,
	offsetX: 0,
	offsetY: 0,
	alt: 2000,
	autoHide: true,
	data: data,
	pickable: true,
	renderOrder: 100,
})

markerLayer.onPicked = (info) => {
	console.log('onPicked', info)
}

markerLayer.onHovered = (info) => {
	// console.log('onHovered', info)
}

earth.add(markerLayer)

// setTimeout(() => {
// 	earth.add(markerLayer)
// }, 1000)

// Polygon
const polygonLayer1 = (window['layer1'] = new PolygonLayer({
	getFillColor: () => Math.random() * 0x00ffff,
	// getFillColor: '#689826',
	getSideColor: '#999999',
	getFillOpacity: 1.0,
	transparent: false,
	getThickness: 300000,
	enableExtrude: false,
	baseAlt: 0,
	depthTest: true,
	pickable: true,
	multiSelect: false,
	selectColor: false,
	hoverColor: false,
}))
p.add(polygonLayer1)
polygonLayer1.updateData('https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/json/china_full.json')

window['data'] = data
window['layer'] = markerLayer
window['earth'] = earth
window['p'] = p
