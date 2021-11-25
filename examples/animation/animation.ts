import { buildSphere } from '@gs.i/utils-geom-builders'
import { Mesh, MatrUnlit, Geom } from '@gs.i/frontend-sdk'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { STDLayer } from '@polaris.gl/layer-std'
import { Matrix4 } from '@gs.i/utils-math'
import { applyMatrixToAttr } from '@polaris.gl/utils'
import { CameraAnimation, PathAnimation } from '@polaris.gl/utils-animation'

const p = new PolarisGSIGL2({
	container: document.querySelector('#container') as HTMLDivElement,
	width: 800,
	height: 800,
	// center: [116.4, 39.9],
	zoom: 3,
	pitch: 0,
	debug: true,
	lights: {
		ambientLight: {
			name: 'ambient1',
			color: '#ffffff',
			intensity: 2,
		},
	},
})
p.timeline.config.ignoreErrors = false

// Earth
const earth = new STDLayer({})
const mesh = new Mesh({
	name: 'Earth',
	geometry: buildSphere({
		radius: 6378137,
		widthSegments: 128,
		heightSegments: 64,
		normal: true,
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
const _m3 = new Matrix4()
earth.getProjection().then((projection) => {
	const geom = mesh.geometry as Geom
	_m1.makeRotationY((-1 * Math.PI) / 2)
	_m2.makeTranslation(-projection['_xyz0'][0], -projection['_xyz0'][1], -projection['_xyz0'][2])
	_m3.multiplyMatrices(_m2, _m1)
	applyMatrixToAttr(geom.attributes.position, _m3)
	applyMatrixToAttr(geom.attributes.normal, _m1)
	geom.boundingBox = undefined
	geom.boundingSphere = undefined
	earth.group.add(mesh)
})

p.addByProjection(earth, 1)

//

let top = 5
function createButton(name, onclick, topOffset = 0) {
	const btn = document.createElement('button')
	btn.innerText = name
	btn.style.position = 'absolute'
	btn.style.left = p.width + 10 + 'px'
	btn.style.top = topOffset + top + 'px'
	document.body.appendChild(btn)
	btn.onclick = onclick
	top += topOffset + 30
	return btn
}

let inputOffset = 0
function createInput(name, value, topOffset = 0) {
	const input = document.createElement('input')
	input.value = value
	input.style.position = 'absolute'
	input.style.left = p.width + 120 + 'px'
	input.style.top = top + inputOffset + topOffset + 'px'
	document.body.appendChild(input)

	const div = document.createElement('div')
	div.innerText = name
	div.style.position = 'absolute'
	div.style.left = p.width + 280 + 'px'
	div.style.top = top + inputOffset + topOffset + 'px'
	document.body.appendChild(div)

	inputOffset += 30
	return input
}

// CameraAnimation
const camAnim = new CameraAnimation(p)

const moveBtn = createButton('Move', () => camAnim.move(1000000, 1000000))
const swingBtn = createButton('OrbitSwing', () => camAnim.orbitSwing(120, 30, 10000))
const rotateBtn = createButton('OrbitRotate', () => camAnim.orbitRotate(10, 0))
const moveLimitBtn = createButton('Move_with_limit', () =>
	camAnim.move(2000000, 500000, [-100, -45], [100, 45], true)
)
const stopBtn = createButton('Stop', () => camAnim.stop())

// PathAnimation
const pathAnim = new PathAnimation(p, { loop: true })

//
const offset = 70

const div = document.createElement('div')
div.style.position = 'absolute'
div.style.left = p.width + 10 + 'px'
div.style.top = '600px'
div.style.width = '600px'
document.body.appendChild(div)

const durationInput = createInput('duration', '1000', offset)
const delayInput = createInput('delay', '500', offset)

const pathAddBtn = createButton(
	'Add_path',
	() => {
		pathAnim.addPath({
			cameraStates: p.getStatesCode(),
			duration: parseFloat(durationInput.value),
			delay: parseFloat(delayInput.value),
			easing: 'smooth',
		})
	},
	offset
)
const pathPlayBtn = createButton('Play_path', () => pathAnim.play())
const pathStopBtn = createButton('Stop_path', () => pathAnim.stop())
const pathPauseBtn = createButton('Pause_path', () => pathAnim.pause())
const pathClearBtn = createButton('Clear_path', () => pathAnim.clear())

p.timeline.addTrack({
	duration: Infinity,
	onUpdate: () => {
		updatePathContent(div)
	},
})
function updatePathContent(element) {
	element.innerHTML = ''
	for (let i = 0; i < pathAnim.paths.length; i++) {
		const path = pathAnim.paths[i]
		element.innerHTML += `${path.cameraStates} [${path.duration}] [${path.delay}]\n`
	}
}

//

p.setStatesCode('1|0.000000|0.000000|0.000000|0.68000|-0.67000|3.00000')

//

window['p'] = p
window['earth'] = earth
window['camAnim'] = camAnim
window['pathAnim'] = pathAnim
