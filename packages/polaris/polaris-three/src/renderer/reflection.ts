import type { PolarisThree } from './../index'
import type { CameraProxy } from 'camera-proxy'
/**
 * ground reflection based on reflection probe.
 */

import {
	Mesh,
	Scene,
	Vector2,
	WebGLRenderTarget,
	PerspectiveCamera,
	NearestFilter,
	RGBFormat,
	LinearFilter,
	BufferGeometry,
	BufferAttribute,
	MeshBasicMaterial,
	WebGLRenderer,
} from 'three'

import * as THREE from 'three'
// import Pass from './pipeline/Pass'
import FXAAPass from './pipeline/pass/FXAAPass'
import BlurPass from './pipeline/pass/BlurPass'

/**
 * pure functional mesh.
 * @note needs to be rendered to work
 */
class PureMesh extends Mesh {
	readonly geometry = new BufferGeometry()
	readonly material = new MeshBasicMaterial()
	readonly frustumCulled = false as const
	constructor() {
		super()
		this.geometry.setAttribute(
			'position',
			new BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3, false)
		)
	}
}

export class Reflector extends PureMesh {
	readonly name = 'Reflector' as const
	readonly renderOrder = -Infinity

	// readonly reflectionCamera = new PerspectiveCamera()

	readonly reflectionTexture: WebGLRenderTarget
	readonly reflectionTextureFXAA: WebGLRenderTarget
	readonly reflectionTextureRough: WebGLRenderTarget

	// readonly drawPass: Pass
	readonly fxaaPass: FXAAPass
	readonly blurPass: BlurPass

	readonly reflectionTexMatrix = new THREE.Matrix4()

	private readonly cameraProxy: CameraProxy

	// config: Required<RendererConfig>

	constructor(renderer: WebGLRenderer, cameraProxy: CameraProxy, reflectionRatio = 0.5) {
		super()

		this.cameraProxy = cameraProxy

		const canvasSize = new Vector2()
		renderer.getSize(canvasSize)

		const reflectionWidth = Math.floor(canvasSize.x * reflectionRatio)
		const reflectionHeight = Math.floor(canvasSize.y * reflectionRatio)

		this.reflectionTexture = new WebGLRenderTarget(reflectionWidth, reflectionHeight, {
			minFilter: NearestFilter,
			magFilter: NearestFilter,
			format: RGBFormat,
			stencilBuffer: false,
			// depthBuffer: false,
		})
		this.reflectionTexture.texture.generateMipmaps = false

		this.reflectionTextureFXAA = new WebGLRenderTarget(reflectionWidth, reflectionHeight, {
			minFilter: LinearFilter,
			magFilter: LinearFilter,
			format: RGBFormat,
			stencilBuffer: false,
			depthBuffer: false,
		})
		this.reflectionTextureFXAA.texture.generateMipmaps = false

		this.reflectionTextureRough = new WebGLRenderTarget(reflectionWidth / 2, reflectionHeight / 2, {
			minFilter: LinearFilter,
			magFilter: LinearFilter,
			format: RGBFormat,
			stencilBuffer: false,
			depthBuffer: false,
		})
		this.reflectionTextureRough.texture.generateMipmaps = false

		const reflectionCamera = new PerspectiveCamera()
		reflectionCamera.name = 'reflectionCamera'

		// 基础场景绘制

		// this.drawPass = new Pass(
		// 	{
		// 		// width: reflectionWidth,
		// 		// height: reflectionHeight,
		// 		scene: scene,
		// 		camera: reflectionCamera,
		// 	},
		// 	THREE
		// )

		// this.drawPass.setOutput(this.reflectionTexture)

		// AA
		this.fxaaPass = new FXAAPass(
			{
				width: reflectionWidth,
				height: reflectionHeight,
			},
			THREE
		)

		this.fxaaPass.setInput(this.reflectionTexture)
		this.fxaaPass.setOutput(this.reflectionTextureFXAA)

		// 模糊
		this.blurPass = new BlurPass(
			{
				width: reflectionWidth,
				height: reflectionHeight,
				kernel: 3,
			},
			THREE
		)

		this.blurPass.setInput(this.reflectionTextureFXAA)
		this.blurPass.setOutput(this.reflectionTextureRough)

		const clipBias = 0

		const reflectorPlane = new THREE.Plane()
		const normal = new THREE.Vector3(0, 1, 0)
		const cameraWorldPosition = new THREE.Vector3()
		const reflectorWorldPosition = new THREE.Vector3()
		const rotationMatrix = new THREE.Matrix4()
		const clipPlane = new THREE.Vector4()

		const view = new THREE.Vector3()
		const q = new THREE.Vector4()
		const target = new THREE.Vector3()

		this.reflectionTexMatrix = new THREE.Matrix4()

		this.onBeforeRender = (renderer, scene, _camera) => {
			const camera = _camera as PerspectiveCamera

			cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld)

			view.copy(cameraWorldPosition)
			view.y = -view.y

			// 按照Polaris的相机设计，视野中心应该总是000，除非相机整体偏移
			target.y = -this.cameraProxy.getGeographicStates().center[2]

			rotationMatrix.extractRotation(camera.matrixWorld)

			reflectionCamera.position.copy(view)
			reflectionCamera.up.set(0, 1, 0)
			reflectionCamera.up.applyMatrix4(rotationMatrix)
			reflectionCamera.up.reflect(normal)
			reflectionCamera.lookAt(target)

			reflectionCamera.far = camera.far // Used in WebGLBackground
			reflectionCamera.near = camera.near // Used in WebGLBackground

			reflectionCamera.updateMatrixWorld()
			reflectionCamera.projectionMatrix.copy(camera.projectionMatrix)

			// Update the texture matrix
			// prettier-ignore
			this.reflectionTexMatrix.set(
				0.5, 0.0, 0.0, 0.5,
				0.0, 0.5, 0.0, 0.5,
				0.0, 0.0, 0.5, 0.5,
				0.0, 0.0, 0.0, 1.0
			)
			this.reflectionTexMatrix.multiply(reflectionCamera.projectionMatrix)
			this.reflectionTexMatrix.multiply(reflectionCamera.matrixWorldInverse)
			// this.reflectionTexMatrix.multiply( this.reflector.matrixWorld );

			// Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
			// Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
			reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition) // 001, 000
			reflectorPlane.applyMatrix4(reflectionCamera.matrixWorldInverse)

			clipPlane.set(
				reflectorPlane.normal.x,
				reflectorPlane.normal.y,
				reflectorPlane.normal.z,
				reflectorPlane.constant
			)

			const projectionMatrix = reflectionCamera.projectionMatrix

			q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0]
			q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5]
			q.z = -1.0
			q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14]

			// Calculate the scaled plane vector
			clipPlane.multiplyScalar(2.0 / clipPlane.dot(q))

			// Replacing the third row of the projection matrix
			projectionMatrix.elements[2] = clipPlane.x
			projectionMatrix.elements[6] = clipPlane.y
			projectionMatrix.elements[10] = clipPlane.z + 1.0 - clipBias
			projectionMatrix.elements[14] = clipPlane.w

			// Render

			this.reflectionTexture.texture.encoding = renderer.outputEncoding

			this.visible = false

			const currentRenderTarget = renderer.getRenderTarget()

			const currentXrEnabled = renderer.xr.enabled
			const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate

			renderer.xr.enabled = false // Avoid camera modification
			renderer.shadowMap.autoUpdate = false // Avoid re-computing shadows

			renderer.setRenderTarget(this.reflectionTexture)

			renderer.state.buffers.depth.setMask(true) // make sure the depth buffer is writable so it can be properly cleared, see #18897

			if (renderer.autoClear === false) renderer.clear()
			renderer.render(scene, reflectionCamera)
			// this.pipeline.render()

			// NOTE TODO 不这样做的话似乎会有不clear的情况
			renderer.autoClear = true
			this.fxaaPass.render(renderer)
			renderer.autoClear = false
			this.blurPass.render(renderer)

			renderer.autoClear = true

			renderer.xr.enabled = currentXrEnabled
			renderer.shadowMap.autoUpdate = currentShadowAutoUpdate

			renderer.setRenderTarget(currentRenderTarget)

			// Restore viewport

			this.visible = true
		}
	}

	resize(renderer: WebGLRenderer, reflectionRatio = 0.5) {
		const canvasSize = new Vector2()
		renderer.getSize(canvasSize)
		const reflectionWidth = Math.floor(canvasSize.width * reflectionRatio)
		const reflectionHeight = Math.floor(canvasSize.height * reflectionRatio)

		this.reflectionTexture.setSize(reflectionWidth, reflectionHeight)
		this.reflectionTextureFXAA.setSize(reflectionWidth, reflectionHeight)
		this.reflectionTextureRough.setSize(reflectionWidth / 2, reflectionHeight / 2)
		// this.drawPass.resize(reflectionWidth, reflectionHeight)
		this.fxaaPass.resize(reflectionWidth, reflectionHeight)
		this.blurPass.resize(reflectionWidth, reflectionHeight)
	}
}

export function initReflection(polaris: PolarisThree) {
	const threeRenderer = polaris.renderer.renderer

	const reflector = new Reflector(threeRenderer, polaris.cameraProxy, 0.5)

	return reflector
}

// export function updateReflection(polarisRenderer: ThreeRenderer) {}
