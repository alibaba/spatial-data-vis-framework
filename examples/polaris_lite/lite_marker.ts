import { Mesh, MatrUnlit, Geom } from '@gs.i/frontend-sdk'
import { MarkerLayer } from '@polaris.gl/layer-std-marker'
import { PolarisLite } from '@polaris.gl/lite'
import { LineStringLayer } from '@polaris.gl/layer-geojson'
import { buildSphere, buildPlane } from '@gs.i/utils-geom-builders'
import { GeocentricProjection, SphereProjection } from '@polaris.gl/projection'
import { STDLayer } from '@polaris.gl/layer-std'
import { Matrix4 } from '@gs.i/utils-math'
import { applyMatrixToAttr } from '@polaris.gl/utils'

const p = (window['p'] = new PolarisLite({
	container: document.querySelector('#container') as HTMLDivElement,
	// center: [116.46, 39.92],
	zoom: 3,
	pitch: 0,
	rotation: 0,
	width: 1000,
	height: 1000,
	debug: true,
}))

// Earth
const earth = new STDLayer({
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
		opacity: 0.5,
	}),
})

const div = document.createElement('div')
div.style.fontSize = '12px'
// div.style.backgroundColor = '#00ffff'
div.style.width = '20px'
div.style.height = '20px'

// Marker data
const data: any[] = []
for (let i = 0; i < 50; i++) {
	const html = div.cloneNode() as HTMLElement
	// html.style.backgroundColor = `#${Math.floor(Math.random() * 0xffffff).toString(16)}`
	html.innerHTML = i.toString()
	data.push({
		lng: Math.random() * 360,
		lat: -90 + Math.random() * 180,
		// alt: 1000000 * Math.random(),
		// html: html,
		html: 'text' + i,
		// autoHide: Math.random() > 0.5,
	})
}

data.push({
	lng: 116.46,
	lat: 39.92,
	// gif
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
	// alt: 2000000,
	autoHide: true,
	data: data,
	pickable: true,
})

markerLayer.onPicked = (info) => {
	console.log('onPicked', info)
}

markerLayer.onHovered = (info) => {
	// console.log('onHovered', info)
}

setTimeout(() => {
	earth.add(markerLayer)
}, 1000)

const lineLayer = new LineStringLayer({
	color: '#ff0000',
	lineWidth: 3,
	baseAlt: 10,
	texture: undefined,
})
p.add(lineLayer)
lineLayer.updateData(
	'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/simple/amap/China_Line_25.json'
)

window['data'] = data
window['layer'] = markerLayer
window['earth'] = earth
window['p'] = p
