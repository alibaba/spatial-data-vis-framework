import {
	BufferAttribute,
	BufferGeometry,
	LinearFilter,
	MeshBasicMaterial,
	RGBAFormat,
	// Color,
	Matrix4,
	Mesh,
	PerspectiveCamera,
	Plane,
	ShaderMaterial,
	UniformsUtils,
	Vector3,
	Vector4,
	WebGLRenderTarget,
	PlaneBufferGeometry,
	Texture,
} from 'three'

import FXAAPass from './pipeline/pass/FXAAPass'
import BlurPass from './pipeline/pass/BlurPass'
import Pass from './pipeline/Pass'

/**
 * pure functional mesh.
 * @note needs to be rendered to work
 */
class PureMesh extends Mesh<BufferGeometry, MeshBasicMaterial> {
	readonly geometry = new BufferGeometry()
	readonly material = new MeshBasicMaterial()
	readonly frustumCulled = false as const
	constructor() {
		super()
		this.geometry.setAttribute(
			'position',
			new BufferAttribute(new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]), 3, false)
		)
	}
}

export class Reflector extends PureMesh {
	readonly isReflector = true

	private readonly camera = new PerspectiveCamera()
	private readonly renderTarget: WebGLRenderTarget
	private readonly renderTargetCopy: WebGLRenderTarget

	// private readonly renderTargetFXAA: WebGLRenderTarget
	private readonly renderTargetBlur: WebGLRenderTarget
	// private readonly fxaaPass: FXAAPass
	private readonly blurPass: BlurPass
	private readonly copyPass: Pass

	readonly texture: Texture
	readonly textureBlur: Texture
	readonly reflectionMatrix: Matrix4

	constructor(options: {
		textureWidth?: number
		textureHeight?: number
		clipBias?: number
		debug?: boolean
		debugBlur?: boolean
	}) {
		super()

		this.type = 'Reflector'

		const textureWidth = options.textureWidth || 512
		const textureHeight = options.textureHeight || 512
		const clipBias = options.clipBias || 0
		const debug = options.debug ?? false
		const debugBlur = options.debugBlur ?? false

		//

		const reflectorPlane = new Plane()
		const normal = new Vector3()
		const reflectorWorldPosition = new Vector3()
		const cameraWorldPosition = new Vector3()
		const rotationMatrix = new Matrix4()
		const lookAtPosition = new Vector3(0, 0, -1)
		const clipPlane = new Vector4()

		const view = new Vector3()
		const target = new Vector3()
		const q = new Vector4()

		this.reflectionMatrix = new Matrix4()

		const virtualCamera = this.camera

		this.renderTarget = new WebGLRenderTarget(textureWidth, textureHeight, {
			samples: 4,
		} as any)

		this.renderTargetCopy = new WebGLRenderTarget(textureWidth, textureHeight)

		this.texture = this.renderTargetCopy.texture

		// start

		// this.renderTargetFXAA = new WebGLRenderTarget(textureWidth, textureHeight, {
		// 	minFilter: LinearFilter,
		// 	magFilter: LinearFilter,
		// 	format: RGBAFormat,
		// 	stencilBuffer: false,
		// 	depthBuffer: false,
		// })
		// this.renderTargetFXAA.texture.generateMipmaps = false

		this.renderTargetBlur = new WebGLRenderTarget(textureWidth / 2, textureHeight / 2, {
			minFilter: LinearFilter,
			magFilter: LinearFilter,
			format: RGBAFormat,
			stencilBuffer: false,
			depthBuffer: false,
		})
		this.renderTargetBlur.texture.generateMipmaps = false

		this.textureBlur = this.renderTargetBlur.texture

		// use fxaa instead of msaa
		// {
		// 	// AA
		// 	this.fxaaPass = new FXAAPass({
		// 		width: textureWidth,
		// 		height: textureHeight,
		// 	})
		// 	this.fxaaPass.setInput(this.renderTarget)
		// 	this.fxaaPass.setOutput(this.renderTargetFXAA)
		// 	// 模糊
		// 	this.blurPass = new BlurPass({
		// 		width: textureWidth,
		// 		height: textureHeight,
		// 		kernel: 4,
		// 	})
		// 	this.blurPass.setInput(this.renderTargetFXAA)
		// 	this.blurPass.setOutput(this.renderTargetBlur)
		// }

		// 复制

		this.copyPass = new Pass({
			width: textureWidth,
			height: textureHeight,
			kernel: 4,
		})

		this.copyPass.setInput(this.renderTarget)
		this.copyPass.setOutput(this.renderTargetCopy)

		// 模糊
		this.blurPass = new BlurPass({
			width: textureWidth,
			height: textureHeight,
			kernel: 4,
		})

		this.blurPass.setInput(this.renderTargetCopy)
		this.blurPass.setOutput(this.renderTargetBlur)

		// end

		this.onBeforeRender = (renderer, scene, _camera) => {
			const camera = _camera as PerspectiveCamera

			reflectorWorldPosition.setFromMatrixPosition(this.matrixWorld)
			cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld)

			rotationMatrix.extractRotation(this.matrixWorld)

			normal.set(0, 0, 1)
			normal.applyMatrix4(rotationMatrix)

			view.subVectors(reflectorWorldPosition, cameraWorldPosition)

			// Avoid rendering when reflector is facing away

			if (view.dot(normal) > 0) return

			view.reflect(normal).negate()
			view.add(reflectorWorldPosition)

			rotationMatrix.extractRotation(camera.matrixWorld)

			lookAtPosition.set(0, 0, -1)
			lookAtPosition.applyMatrix4(rotationMatrix)
			lookAtPosition.add(cameraWorldPosition)

			target.subVectors(reflectorWorldPosition, lookAtPosition)
			target.reflect(normal).negate()
			target.add(reflectorWorldPosition)

			virtualCamera.position.copy(view)
			virtualCamera.up.set(0, 1, 0)
			virtualCamera.up.applyMatrix4(rotationMatrix)
			virtualCamera.up.reflect(normal)
			virtualCamera.lookAt(target)

			virtualCamera.far = camera.far // Used in WebGLBackground

			virtualCamera.updateMatrixWorld()
			virtualCamera.projectionMatrix.copy(camera.projectionMatrix)

			// Update the texture matrix
			// prettier-ignore
			this.reflectionMatrix.set(
				0.5, 0.0, 0.0, 0.5,
				0.0, 0.5, 0.0, 0.5,
				0.0, 0.0, 0.5, 0.5,
				0.0, 0.0, 0.0, 1.0
			);
			this.reflectionMatrix.multiply(virtualCamera.projectionMatrix)
			this.reflectionMatrix.multiply(virtualCamera.matrixWorldInverse)
			// this.reflectionMatrix.multiply(this.matrixWorld)

			// Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
			// Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
			reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition)
			reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse)

			clipPlane.set(
				reflectorPlane.normal.x,
				reflectorPlane.normal.y,
				reflectorPlane.normal.z,
				reflectorPlane.constant
			)

			const projectionMatrix = virtualCamera.projectionMatrix

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

			this.renderTarget.texture.encoding = renderer.outputEncoding

			this.visible = false

			const currentRenderTarget = renderer.getRenderTarget()

			const currentXrEnabled = renderer.xr.enabled
			const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate

			renderer.xr.enabled = false // Avoid camera modification
			renderer.shadowMap.autoUpdate = false // Avoid re-computing shadows

			renderer.setRenderTarget(this.renderTarget)

			renderer.state.buffers.depth.setMask(true) // make sure the depth buffer is writable so it can be properly cleared, see #18897

			// start

			if (renderer.autoClear === false) renderer.clear()
			renderer.render(scene, virtualCamera)

			// renderer.autoClear = true
			// this.fxaaPass.render(renderer)
			// renderer.autoClear = false
			renderer.autoClear = false
			this.copyPass.render(renderer)
			// renderer.autoClear = true
			this.blurPass.render(renderer)

			renderer.autoClear = true

			// end

			renderer.xr.enabled = currentXrEnabled
			renderer.shadowMap.autoUpdate = currentShadowAutoUpdate

			renderer.setRenderTarget(currentRenderTarget)

			// r139 上没有这个属性

			// // Restore viewport

			// const viewport = camera.viewport

			// if (viewport !== undefined) {
			// 	renderer.state.viewport(viewport)
			// }

			this.visible = true
		}

		if (debugBlur) {
			const debugMesh = new DebugPlaneMesh(this.reflectionMatrix, this.renderTargetBlur)
			this.add(debugMesh)
		} else if (debug) {
			const debugMesh = new DebugPlaneMesh(this.reflectionMatrix, this.renderTarget)
			this.add(debugMesh)
		}
	}

	resize(width: number, height: number) {
		const reflectionWidth = Math.floor(width)
		const reflectionHeight = Math.floor(height)

		this.renderTarget.setSize(reflectionWidth, reflectionHeight)
		this.renderTargetCopy.setSize(reflectionWidth, reflectionHeight)
		// this.renderTargetFXAA.setSize(reflectionWidth, reflectionHeight)
		this.renderTargetBlur.setSize(reflectionWidth / 2, reflectionHeight / 2)
		// this.drawPass.resize(reflectionWidth, reflectionHeight)
		// this.fxaaPass.resize(reflectionWidth, reflectionHeight)
		this.blurPass.resize(reflectionWidth, reflectionHeight)
		this.copyPass.resize(reflectionWidth, reflectionHeight)
	}

	dispose() {
		this.renderTarget.dispose()
		this.renderTargetBlur.dispose()
		this.material.dispose()
		this.blurPass.dispose()
	}
}

/**
 * debug the reflection texture
 */
class DebugPlaneMesh extends Mesh<PlaneBufferGeometry, ShaderMaterial> {
	constructor(reflectionMatrix: Matrix4, rt: WebGLRenderTarget) {
		super()

		const shader = DebugPlaneMesh.Shader

		this.geometry = new PlaneBufferGeometry(100000, 100000)
		this.material = new ShaderMaterial({
			uniforms: UniformsUtils.clone(shader.uniforms),
			fragmentShader: shader.fragmentShader,
			vertexShader: shader.vertexShader,
		})

		// material.uniforms['color'].value = color
		this.material.uniforms['reflectionMatrix'].value = reflectionMatrix
		this.material.uniforms['reflectionMap'].value = rt.texture
	}

	static Shader = {
		uniforms: {
			// color: {
			// 	value: new Color('black'),
			// },

			reflectionMap: {
				value: null,
			},

			reflectionMatrix: {
				value: null,
			},
		},

		vertexShader: /* glsl */ `
		uniform mat4 reflectionMatrix;
		varying vec4 vUvReflection;

		#include <common>

		void main() {

			vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
			vUvReflection = reflectionMatrix * vec4( worldPosition.xyz, 1.0 );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );


		}`,

		fragmentShader: /* glsl */ `
		uniform vec3 color;
		uniform sampler2D reflectionMap;
		varying vec4 vUvReflection;


		float blendOverlay( float base, float blend ) {

			return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

		}

		vec3 blendOverlay( vec3 base, vec3 blend ) {

			return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

		}

		void main() {

			vec4 reflectionColor = texture2DProj( reflectionMap, vUvReflection );
			// gl_FragColor = vec4( blendOverlay( reflectionColor.rgb, color ), 1.0 );
			gl_FragColor = vec4(reflectionColor.rgb, 1.0);

			#include <encodings_fragment>

		}`,
	}
}
