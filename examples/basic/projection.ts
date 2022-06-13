import { AMapLayer } from '@polaris.gl/layer-amap'
import { buildSphere } from '@gs.i/utils-geom-builders'
import { Mesh, MatrPbr, Geom } from '@gs.i/frontend-sdk'
import {
	SphereProjection,
	MercatorProjection,
	EquirectangularProjectionPDC,
	MercatorProjectionPDC,
} from '@polaris.gl/projection'
import { PolygonLayer, LineStringLayer } from '@polaris.gl/layer-geojson'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { STDLayer } from '@polaris.gl/layer-std'
import { Matrix4 } from '@gs.i/utils-math'
import { applyMatrixToAttr } from '@polaris.gl/utils'

const p = new PolarisGSIGL2({
	container: document.querySelector('#container') as HTMLDivElement,
	width: 800,
	height: 800,
	// center: [116.4, 39.9],
	zoom: 3,
	zoomLimit: [1, 19],
	pitch: 0,
	debug: true,
	lights: {
		ambientLight: {
			name: 'ambient1',
			color: '#ffffff',
			intensity: 2,
		},
		directionalLights: [
			{
				name: 'dLight1',
				color: '#ffffff',
				intensity: 2,
				position: { x: -1, y: -1, z: -1 },
			},
			{
				name: 'dLight2',
				color: '#ffffff',
				intensity: 2,
				position: { x: 1, y: 1, z: 1 },
			},
		],
	},
	projection: new MercatorProjectionPDC({}),
})
p.timeline.config.ignoreErrors = false

// p.add(new HelperLayer({ box: false, length: 100000000 }))

p.add(new AMapLayer())

const polygonLayer = new PolygonLayer({
	getThickness: 1,
	depthTest: true,
	renderOrder: 0,
})
// p.addByProjection(polygonLayer, 0)
p.add(polygonLayer)

fetch(
	'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/examples/country_unemployment_from_kepler.geojson'
)
	.then((r) => r.json())
	.then((geojson) => {
		polygonLayer.updateData(geojson)
	})

// Earth
// const earth = new STDLayer({})
// const mesh = new Mesh({
// 	name: 'Earth',
// 	geometry: buildSphere({
// 		radius: 6378137,
// 		widthSegments: 128,
// 		heightSegments: 64,
// 		normal: true,
// 		uv: true,
// 	}),
// 	material: new MatrPbr({
// 		baseColorTexture: {
// 			image: {
// 				uri: 'https://img.alicdn.com/tfs/TB1pBhYRpXXXXb2XpXXXXXXXXXX-2048-1024.jpg',
// 				flipY: true,
// 			},
// 			sampler: {},
// 		},
// 	}),
// })

// const _m1 = new Matrix4()
// const _m2 = new Matrix4()
// const _m3 = new Matrix4()
// earth.getProjection().then((projection) => {
// 	const geom = mesh.geometry as Geom

// 	_m1.makeRotationY((-1 * Math.PI) / 2)
// 	_m2.makeTranslation(-projection['_xyz0'][0], -projection['_xyz0'][1], -projection['_xyz0'][2])
// 	applyMatrixToAttr(geom.attributes['position'], _m1)
// 	applyMatrixToAttr(geom.attributes['position'], _m2)
// 	applyMatrixToAttr(geom.attributes['normal'], _m1)

// 	geom.boundingBox = undefined
// 	geom.boundingSphere = undefined

// 	earth.group.add(mesh)
// })

// // p.addByProjection(earth, 1)
// p.add(earth)

const lineLayer = new LineStringLayer({
	color: '#ff0000',
	lineWidth: 50000,
	baseAlt: 10,
	texture: undefined,
	// projection: new MercatorProjection({
	// 	center: [0, 0],
	// }),
})
lineLayer.updateProps({
	color: '#00ff00',
	opacity: 1.0,
	lineWidth: 4,
})
// p.addByProjection(lineLayer, 2, [120, 30])
p.add(lineLayer)
lineLayer.updateData(
	'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/simple/amap/China_Line_25.json'
)

window['p'] = p
// window['layer'] = polygonLayer
// window['earth'] = earth
