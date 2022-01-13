import { Mesh, MatrUnlit, Geom, MatrPbr } from '@gs.i/frontend-sdk'
import { Marker, MarkerLayer } from '@polaris.gl/layer-std-marker'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { LineStringLayer, PolygonLayer } from '@polaris.gl/layer-geojson'
import { buildSphere, buildPlane, buildTorus } from '@gs.i/utils-geom-builders'
import { GeocentricProjection, SphereProjection } from '@polaris.gl/projection'
import { StandardLayer } from '@polaris.gl/layer-std'
import { Matrix4 } from '@gs.i/utils-math'
import { applyMatrixToAttr } from '@polaris.gl/utils'

const container = document.querySelector('#container') as HTMLDivElement
const p = (window['p'] = new PolarisGSIGL2({
	container,
	// center: [116.46, 39.92],
	zoom: 3,
	pitch: 0,
	rotation: 0,
	width: 1000,
	height: 800,
	debug: true,
}))
// Disable frustum culling
p.renderer.conv.config.meshFrustumCulling = false

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
		opacity: 0.4,
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
const plane = new Mesh({
	name: 'Marker mesh',
	geometry: buildPlane({
		width: 1000000,
		height: 1000000,
		widthSegments: 1,
		heightSegments: 1,
	}),
	material: new MatrUnlit({
		baseColorFactor: { r: 0.5, g: 0.5, b: 1.0 },
		side: 'double',
	}),
})

// Marker data
const beijing = {
	lng: 116.46,
	lat: 39.92,
	alt: 0,
	html: `<a>BEIJING</a>`,
}
const data: any[] = [beijing]

const markerLayer = new MarkerLayer({
	html: '222',
	style: {
		color: '#afafff',
	},
	object3d: plane,
	offsetX: 0,
	offsetY: -20,
	autoHide: true,
	data: data,
	pickable: true,
})
markerLayer.onPicked = (info) => {
	console.log('onPicked', info)
}
earth.add(markerLayer)

const lineLayer = new LineStringLayer({
	color: '#ff0000',
	lineWidth: 2,
	baseAlt: 10,
	texture: undefined,
})
p.add(lineLayer)
lineLayer.updateData(
	'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/simple/amap/China_Line_25.json'
)

// USA polygon
const polygonLayer2 = (window['layer2'] = new PolygonLayer({
	getFillColor: '#c7c33f',
	getFillOpacity: 1.0,
	getSideColor: '#999999',
	getThickness: 100000,
	enableExtrude: true,
	// opacity: 1.0,
	baseAlt: 0,
	depthTest: true,
	pickable: true,
}))
p.add(polygonLayer2)
polygonLayer2.updateData(
	'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/examples/country_unemployment_from_kepler.geojson'
)
const usa = document.createElement('div')
usa.style.position = 'absolute'
usa.style.background = '#afaf0f'
usa.innerText = 'picked'
container.appendChild(usa)
const marker = new Marker({
	lng: 0,
	lat: 0,
	alt: 0,
	html: usa,
})
marker.visible = false
polygonLayer2.add(marker)
polygonLayer2.onPicked = (info) => {
	console.log('onPicked', info)
	if (info) {
		const point = info.point
		const lnglatalt = polygonLayer2.toLngLatAlt(point.x, point.y, point.z)
		if (lnglatalt) {
			console.log('picked lnglat', lnglatalt)
			marker.updateProps({
				lng: lnglatalt[0],
				lat: lnglatalt[1],
				alt: lnglatalt[2],
			})
			marker.visible = true
		}
	} else {
		marker.visible = false
	}
}

// TEST - Layer.toScreenXY()/toWorldPosition
const testLabel = document.createElement('div')
testLabel.style.position = 'absolute'
testLabel.style.background = '#00ffff'
container.appendChild(testLabel)

const sphere = new Mesh({
	name: 'positioner',
	geometry: buildSphere({
		radius: 200000,
		normal: true,
	}),
	material: new MatrUnlit(),
})
p.view.gsi.groupWrapper.add(sphere)

p.onBeforeRender = () => {
	const xy = markerLayer.toScreenXY(beijing.lng, beijing.lat, beijing.alt)
	if (xy) {
		testLabel.innerText = `ScreenXY: ${Math.round(xy.x)}|${Math.round(xy.y)}`
		testLabel.style.left = xy.x + 'px'
		testLabel.style.top = xy.y + 'px'
	}

	const pos = markerLayer.toWorldPosition(beijing.lng, beijing.lat, beijing.alt)
	if (pos && sphere.transform.worldMatrix) {
		sphere.transform.worldMatrix[12] = pos.x
		sphere.transform.worldMatrix[13] = pos.y
		sphere.transform.worldMatrix[14] = pos.z
	}
}

window['data'] = data
window['layer'] = markerLayer
window['earth'] = earth
window['p'] = p
