import { buildSphere } from '@gs.i/utils-geom-builders'
import { Mesh, MatrUnlit, Geom } from '@gs.i/frontend-sdk'
import { SphereProjection, MercatorProjection } from '@polaris.gl/projection'
import { PolygonLayer, LineStringLayer } from '@polaris.gl/layer-geojson'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { StandardLayer } from '@polaris.gl/layer-std'
import { Matrix4 } from '@gs.i/utils-math'
import { applyMatrixToAttr } from '@polaris.gl/utils'

const p = new PolarisGSIGL2({
	container: document.querySelector('#container') as HTMLDivElement,
	width: 800,
	height: 800,
	pitch: 0,
	// debug: true,
})
// p.timeline._config.onError = (e) => throw e

//

// p.setStatesCode('1|0.000000|0.000000|0.000000|0.00000|0.00000|1.44800')
const states0 = '1|0.000000|0.000000|0.000000|0.00000|0.00000|2.5'
const states1 = '1|120.000000|30.000000|0.000000|0.00000|0.00000|9.5'
let i = 0
setInterval(() => {
	i++
	p.setStatesCode(i % 2 === 0 ? states1 : states0, 1000)
}, 2000)

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

const lineLayer = new LineStringLayer({
	color: '#ff0000',
	lineWidth: 50000,
	baseAlt: 10,
	texture: undefined,
	projection: new MercatorProjection({
		center: [0, 0],
	}),
})
lineLayer.updateProps({
	color: '#00ff00',
	opacity: 0.5,
	lineWidth: 2,
})
p.add(lineLayer)
lineLayer.updateData(
	'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/simple/amap/China_Line_25.json'
)

window['p'] = p
window['cam'] = p.cameraProxy
window['lineLayer'] = lineLayer
window['earth'] = earth
