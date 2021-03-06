/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { MeshDataType } from '@gs.i/schema'
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import GL2, { THREE, Renderer as GL2THREERenderer, Pass, BlurPass, FXAAPass } from 'gl2'
import { Renderer, colorToString, PolarisProps, PickResult } from '@polaris.gl/base'
import { DefaultConfig as GL2ConvConfig, GL2Converter, RenderableObject3D } from '@gs.i/backend-gl2'
import { CameraProxy } from 'camera-proxy'
import * as SDK from '@gs.i/frontend-sdk'
import { GSIView } from '@polaris.gl/view-gsi'
import * as postprocessing from 'postprocessing'
const { EffectComposer, ShaderPass } = postprocessing
import { BokehPass } from './passes/BokehPass'
import { ReadPass } from './passes/ReadPass'
import { calcCamNearFar, genFXAAMaterial, patchLegacyPass, providePassArgs } from './Utils'
import { Raycaster, RaycastInfo } from '@gs.i/utils-raycast'

/**
 *
 *
 * @export
 * @interface RendererProps
 * @extends {PolarisProps}
 */
export interface RendererProps extends PolarisProps {
	enableReflection?: boolean
	reflectionRatio?: number
	castShadow?: boolean
}

export const defaultProps = {
	enableReflection: false,
	reflectionRatio: 1.0,
	castShadow: false,
}

/**
 *
 *
 * @export
 * @interface PolarisPass
 * @extends {postprocessing.Pass}
 */
export interface PolarisPass extends postprocessing.Pass {
	onViewChange?: (cam: CameraProxy) => void
	dispose: () => void
	getFullscreenMaterial?: () => any
	enabled?: boolean
}

// Temp vars
const _vec3 = new THREE.Vector3()

/**
 *
 *
 * @export
 * @class GSIGL2Renderer
 * @extends {Renderer}
 */
export class GSIGL2Renderer extends Renderer {
	props: RendererProps

	/**
	 * GSI - GL2 转换器
	 */
	conv: GL2Converter

	/**
	 * GL2 渲染器
	 */
	renderer: GL2THREERenderer
	canvas: HTMLCanvasElement

	/**
	 * 外部进行后处理使用的 fbo
	 */
	frame: THREE.WebGLRenderTarget

	private _clock: THREE.Clock

	/**
	 * GSI - Scene 保留引用，应当不允许更改
	 * 每帧根据cameraProxy修改scene的偏移
	 */
	private gsiScene: SDK.Mesh

	/**
	 * 顶层 scene，由 scene props 生成，在 polaris-renderer 中管理
	 */
	private scene: THREE.Scene

	/**
	 * 场景光源
	 */
	private lights: THREE.Group

	/**
	 * 场景相机
	 */
	private camera: THREE.PerspectiveCamera

	/**
	 * 转换后的 GL2 group
	 */
	private _group: RenderableObject3D

	/**
	 * Postprocessing
	 */
	effectComposer: postprocessing.EffectComposer
	passes: { [name: string]: PolarisPass }

	/**
	 * Picking
	 */
	raycaster: Raycaster
	private _internalThreeRaycaster: THREE.Raycaster

	/**
	 * capabilities object
	 */
	private _capabilities: {
		pointSizeRange: [number, number]
		lineWidthRange: [number, number]
		maxVertexAttributes: number
		maxVaryingVectors: number
		[name: string]: any
	}

	/**
	 * 反射相关FBO、Pass
	 */
	private reflectionTexture: THREE.WebGLRenderTarget
	private reflectionTextureFXAA: THREE.WebGLRenderTarget
	private reflectionTextureRough: THREE.WebGLRenderTarget
	private reflectionDrawPass: Pass
	private reflectionFxaaPass: Pass
	private reflectionBlurPass: Pass
	private reflector: THREE.Mesh
	private reflectionTexMatrix: THREE.Matrix4

	constructor(props: RendererProps) {
		super()

		this.props = {
			...defaultProps,
			...props,
		}

		/**
		 * @stage_0 MPV
		 */
		const canvasWidth = this.props.width * (this.props.ratio ?? 1.0)
		const canvasHeight = this.props.height * (this.props.ratio ?? 1.0)
		const canvas = document.createElement('canvas')
		canvas.width = canvasWidth
		canvas.height = canvasHeight
		canvas.style.position = 'absolute'
		canvas.style.left = '0px'
		canvas.style.top = '0px'
		canvas.style.width = this.props.width + 'px'
		canvas.style.height = this.props.height + 'px'
		this.canvas = canvas

		// Converter
		this.conv = new GL2Converter(GL2ConvConfig)

		/**
		 * init renderer
		 */
		this.renderer = new GL2.Renderer({
			canvas: this.canvas,
			alpha: true,
			antialias: this.props.antialias === 'msaa',
			stencil: false,
		})
		/** @FIXME gamma correction未生效 */
		// this.renderer.gammaOutput = true
		// this.renderer.gammaFactor = 2.2

		/**
		 * init webgl capabilities
		 */
		const gl = this.renderer.getContext()
		this._capabilities = {
			pointSizeRange: gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE),
			lineWidthRange: gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE),
			maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
			maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
		}

		/**
		 * init scene
		 */
		this.scene = new THREE.Scene()
		if (this.props.background === 'transparent') {
			this.scene.background = null
			this.renderer.setClearAlpha(0.0)
		} else {
			this.scene.background = new THREE.Color(this.props.background as string)
		}
		// 在scene optimize pass中主动计算matrix，不需要three的计算了
		this.scene.autoUpdate = false
		this.scene.matrixAutoUpdate = false

		/**
		 * init lights
		 */
		this.lights = new THREE.Group()
		this.lights.name = 'LightsWrapper'
		this.scene.add(this.lights)
		this.initLights()

		/**
		 * init Camera
		 * @note 整个 camera 的转换都放进 renderer 里，这里只提供 camera proxy
		 * 反正在哪里转都是一样的
		 */
		const { cameraNear, cameraFar } = this.props
		this.camera = new THREE.PerspectiveCamera(
			this.props.fov,
			this.props.width / this.props.height,
			cameraNear,
			cameraFar
		)
		this.camera.matrixAutoUpdate = false
		if (this.props.viewOffset) {
			this.camera.setViewOffset(
				this.props.width,
				this.props.height,
				this.props.viewOffset[0],
				this.props.viewOffset[1],
				this.props.viewOffset[2] ?? this.props.width,
				this.props.viewOffset[3] ?? this.props.height
			)
		}

		/**
		 * @stage_1 BI 需要
		 */

		/**
		 * init picking
		 * 出于兼容性、实现简洁性，应该使用 CPU picking （raycasting）
		 * 但是出于 GL2 和 WebGPU 的优势考虑，应该使用 GPU picking （color buffer）
		 * - GPU picking
		 * 		WebGL
		 * 			使用一个单独的 RT
		 * 			使用一个PickingMaterial 绘制layer masked物体，同时编ID，映射layer
		 * 		WebGL2
		 * 			使用一个独立的 color buffer，同步绘制
		 */
		this.raycaster = new Raycaster()
		this._internalThreeRaycaster = new THREE.Raycaster()

		/**
		 * @stage_2 只兼容桌面端，考虑是否放到 GL2 renderer 里，IE 是否需要？
		 */

		// init shadow
		// init reflection
		this.initReflection()

		// init pp
		this.frame = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			stencilBuffer: false,
			depthBuffer: true,
		})
		this.frame.depthTexture = new (THREE.DepthTexture as any)()

		this.initPostprocessing()

		// init debug helper
		if (this.props.debug) {
			// 在 场景中加入 坐标轴
			this.scene.add(new THREE.AxesHelper(1000000000))
		}
	}

	render(view: GSIView) {
		if (!this._group) {
			this._group = this.conv.convert(view.groupWrapper)
			this.scene.add(this._group)
		} else {
			this.conv.convert(view.groupWrapper)
		}

		// GSI Cache
		if (this.gsiScene !== view.groupWrapper) {
			this.gsiScene = view.groupWrapper
		}

		/** patch for three.js memory leak <@link https://github.com/mrdoob/three.js/pull/18411> */
		{
			this.renderer['threeProxy']['renderLists']['dispose']()
		}

		if (this.props.renderToFBO) {
			// Postprocessing rendering
			this.renderer.render(this.scene, this.camera, this.frame, true)
			if (!this._clock) {
				this._clock = new THREE.Clock()
				this._clock.start()
			}
			this.effectComposer.render(this._clock.getDelta())
		} else {
			// Normal rendering
			this.renderer.render(this.scene, this.camera)
		}
	}

	resize(width, height, ratio = 1.0) {
		// 物理像素
		this.canvas.style.width = width + 'px'
		this.canvas.style.height = height + 'px'

		// 逻辑像素
		const canvasWidth = width * ratio
		const canvasHeight = height * ratio
		this.canvas.width = canvasWidth
		this.canvas.height = canvasHeight

		this.props.width = width
		this.props.height = height

		this.renderer.setSize(canvasWidth, canvasHeight)

		this.camera.aspect = canvasWidth / canvasHeight
		this.camera.updateProjectionMatrix()

		// 在PolarisGSI中触发updateCamera()
	}

	capture() {
		// https://stackoverflow.com/questions/32556939/saving-canvas-to-image-via-canvas-todataurl-results-in-black-rectangle/32641456#32641456
		this.renderer.context.flush()
		this.renderer.context.finish()
		return this.canvas.toDataURL('image/png')
	}

	dispose() {
		this.renderer.dispose()
		this.conv.dispose()
		if (this.effectComposer) {
			this.effectComposer.dispose()
		}
		for (const key in this.passes) {
			this.passes[key].dispose()
		}
		this.frame && this.frame.dispose()
		if (this.canvas.parentElement) {
			this.canvas.parentElement.removeChild(this.canvas)
		}
	}

	updateCamera(cam: CameraProxy): void {
		this.camera.position.set(
			cam.position[0] - cam.center[0],
			cam.position[1] - cam.center[1],
			cam.position[2] - cam.center[2]
		)

		this.camera.rotation.fromArray(cam.rotationEuler)
		this.camera.updateMatrix()
		this.camera.updateMatrixWorld(true)

		if (this.gsiScene) {
			this.gsiScene.transform.position.set(-cam.center[0], -cam.center[1], -cam.center[2])
		}

		// Update point lights position
		const pLights = this.props.lights?.pointLights
		if (pLights) {
			this.lights.children.forEach((light) => {
				const type = light.name.split('.')[0]
				const i = light.name.split('.')[1]
				if (i === undefined) return
				const index = parseInt(i)
				if (isNaN(index)) return
				if (type === 'PointLight') {
					light.position.set(
						pLights[index].position.x - cam.center[0],
						pLights[index].position.y - cam.center[1],
						pLights[index].position.z - cam.center[2]
					)
					light.updateMatrix()
					light.updateMatrixWorld(true)
				}
			})
		}

		// Update cameraNear/cameraFar
		const [near, far] = calcCamNearFar(cam)
		if (near && far && (this.camera.near !== near || this.camera.far !== far)) {
			this.camera.near = Math.max(near, this.props.cameraNear as number)
			this.camera.far = Math.min(far, this.props.cameraFar as number)
			this.camera.updateProjectionMatrix()
		}

		// Update postprocessing
		if (this.effectComposer) {
			// The drawing buffer size takes the device pixel ratio into account.
			const { width, height } = this.renderer.getDrawingBufferSize()
			this.frame.setSize(width, height)
			this.effectComposer.inputBuffer.setSize(width, height)
			this.effectComposer.outputBuffer.setSize(width, height)
			for (const pass of this.effectComposer.passes) {
				pass.setSize(width, height)
				pass.onViewChange && pass.onViewChange(cam)
			}
		}

		/** Update reflectionTexture */
		const canvasSize = this.renderer.getSize(new THREE.Vector2())
		// const aspect = canvasSize.width / canvasSize.height
		// const reflectionWidth = this.config.reflectionResolution
		// const reflectionHeight = reflectionWidth / aspect
		const reflectionWidth = Math.floor(canvasSize.width * (this.props.reflectionRatio ?? 1.0))
		const reflectionHeight = Math.floor(canvasSize.height * (this.props.reflectionRatio ?? 1.0))
		this.reflectionTexture.setSize(reflectionWidth, reflectionHeight)
		this.reflectionTextureFXAA.setSize(reflectionWidth, reflectionHeight)
		this.reflectionTextureRough.setSize(reflectionWidth / 2, reflectionHeight / 2)
		this.reflectionDrawPass.resize(reflectionWidth, reflectionHeight)
		this.reflectionFxaaPass.resize(reflectionWidth, reflectionHeight)
		this.reflectionBlurPass.resize(reflectionWidth, reflectionHeight)
	}

	updateProps(props) {
		this.props = {
			...this.props,
			...props,
		}

		// this.scene.background = new THREE.Color(this.props.background as string)
		if (this.props.background === 'transparent') {
			this.scene.background = null
			this.renderer.setClearAlpha(0.0)
		} else {
			this.scene.background = new THREE.Color(this.props.background as string)
		}

		const canvasWidth = this.props.width * (this.props.ratio ?? 1.0)
		const canvasHeight = this.props.height * (this.props.ratio ?? 1.0)
		this.canvas.style.width = this.props.width + 'px'
		this.canvas.style.height = this.props.height + 'px'
		this.canvas.width = canvasWidth
		this.canvas.height = canvasHeight
		this.renderer.setSize(canvasWidth, canvasHeight)
		this.renderer.setViewport(0, 0, canvasWidth, canvasHeight)

		const { cameraNear, cameraFar, fov } = this.props
		this.camera.near = cameraNear as number
		this.camera.far = cameraFar as number
		this.camera.fov = fov as number
		this.camera.aspect = this.props.width / this.props.height
		// TODO: call updateCamera()
		if (this.props.viewOffset && this.props.viewOffset.length === 4) {
			this.camera.setViewOffset(
				this.props.width,
				this.props.height,
				this.props.viewOffset[0],
				this.props.viewOffset[1],
				this.props.viewOffset[2],
				this.props.viewOffset[3]
			)
		}
		this.camera.updateProjectionMatrix()

		this.initLights()

		if (this.props.postprocessing && this.props.postprocessing.length > 0) {
			/** @QianXun 目前先采用全部替换pass的方式来更新pp props */
			this.initPostprocessing()
		} else {
			this.props.renderToFBO = false
			this.renderer.autoClear = true
		}
	}

	getNDC(worldPosition: { x: number; y: number; z: number }): number[] {
		_vec3.x = worldPosition.x
		_vec3.y = worldPosition.y
		_vec3.z = worldPosition.z
		_vec3.project(this.camera)
		return _vec3.toArray()
	}

	/**
	 *
	 *
	 * @param {MeshDataType} object
	 * @param {{ x: number; y: number }} ndcCoords
	 * @param {{ allInters?: boolean; threshold?: number; backfaceCulling?: boolean }} options allInters: 是否返回所有碰撞点并排序; threshold: lineMesh碰撞测试阈值; backfaceCulling: triangleMesh是否测试背面
	 * @return {*}  {PickResult}
	 * @memberof GSIGL2Renderer
	 */
	pick(
		object: MeshDataType,
		ndcCoords: { x: number; y: number },
		options: { allInters?: boolean; threshold?: number; backfaceCulling?: boolean }
	): PickResult {
		const result: PickResult = {
			hit: false,
		}

		this._internalThreeRaycaster.setFromCamera(ndcCoords, this.camera)
		this.raycaster.set(
			this._internalThreeRaycaster.ray.origin.toArray(),
			this._internalThreeRaycaster.ray.direction.toArray()
		)
		this.raycaster.near = this.camera.near
		this.raycaster.far = Infinity

		if (!object.geometry) {
			return result
		}

		let info: RaycastInfo
		options = options ?? {}
		if (object.geometry.mode === 'TRIANGLES') {
			let backfaceCulling = options.backfaceCulling
			if (backfaceCulling === undefined) {
				backfaceCulling = object.material ? object.material.side === 'front' : false
			}
			info = this.raycaster.intersectTriangleMesh(
				object,
				backfaceCulling,
				options.allInters ?? false
			)
		} else if (object.geometry.mode === 'LINES') {
			if (!options.threshold) {
				console.error('Polaris::GSIGL2Renderer - Invalid picking parameter: options.threshold. ')
				return result
			}
			info = this.raycaster.intersectLineMesh(object, options.threshold, options.allInters ?? false)
		} else if (object.geometry.mode === 'SPRITE') {
			info = this.raycaster.intersectSpriteMesh(
				object,
				this.camera.position,
				this.camera.rotation,
				true,
				options.allInters ?? true // Sprites intersection needs all inters
			)
		} else {
			console.warn(
				`Polaris::GSIGL2Renderer - Geometry mode '${object.geometry.mode}' not supported for picking. `
			)
			return result
		}

		if (info.hit) {
			return info
		}
		return result
	}

	getCapabilities(): {
		pointSizeRange: [number, number]
		lineWidthRange: [number, number]
		maxVertexAttributes: number
		maxVaryingVectors: number
		[name: string]: any
	} {
		return this._capabilities
	}

	/**
	 * 初始化场景光源
	 *
	 * @private
	 * @memberof GSIGL2Renderer
	 */
	private initLights() {
		if (this.props.lights) {
			// gltf to three
			if (this.props.lights.ambientLight) {
				const name = 'AmbientLight'
				let aLight: THREE.AmbientLight = this.lights.getObjectByName(name) as THREE.AmbientLight
				if (!aLight) {
					aLight = new THREE.AmbientLight()
					this.lights.add(aLight)
				}
				if (this.props.lights.ambientLight.color) {
					aLight.color = new THREE.Color(colorToString(this.props.lights.ambientLight.color))
				}

				aLight.intensity = this.props.lights.ambientLight.intensity ?? 1.0
				aLight.name = name
				aLight.matrixAutoUpdate = false
			}
			if (this.props.lights.directionalLights) {
				const dLights = this.props.lights.directionalLights
				dLights.forEach((item, index) => {
					const name = 'DirectionalLight.' + index
					let dlight: THREE.DirectionalLight = this.lights.getObjectByName(
						name
					) as THREE.DirectionalLight
					if (!dlight) {
						dlight = new THREE.DirectionalLight()
						this.lights.add(dlight)
					}
					if (item.color) {
						dlight.color = new THREE.Color(colorToString(item.color))
					}
					if (item.position) {
						dlight.position.copy(item.position as THREE.Vector3)
					}
					dlight.intensity = item.intensity ?? 1.0
					dlight.matrixAutoUpdate = false
					dlight.name = name
					dlight.updateMatrix()
					dlight.updateMatrixWorld(true)
				})
				// Remove
				this.lights.children.forEach((item) => {
					const type = item.name.split('.')[0]
					const i = item.name.split('.')[1]
					if (i === undefined) return
					const index = parseInt(i)
					if (isNaN(index)) return
					if (type === 'DirectionalLight' && index >= dLights.length) {
						this.lights.remove(item)
					}
				})
			}
			if (this.props.lights.pointLights) {
				const pLights = this.props.lights.pointLights
				pLights.forEach((item, index) => {
					const name = 'PointLight.' + index
					let plight: THREE.PointLight = this.lights.getObjectByName(name) as THREE.PointLight
					if (!plight) {
						plight = new THREE.PointLight()
						this.lights.add(plight)
					}
					if (item.color) {
						plight.color = new THREE.Color(colorToString(item.color))
					}
					if (item.position) {
						plight.position.copy(item.position as THREE.Vector3)
					}
					plight.intensity = item.intensity ?? 1.0
					plight.distance = item.range ?? 0.0
					plight.decay = 2 // physical
					plight.name = name
					plight.matrixAutoUpdate = false
					plight.updateMatrix()
					plight.updateMatrixWorld(true)
				})
				// Remove
				this.lights.children.forEach((item) => {
					const type = item.name.split('.')[0]
					const i = item.name.split('.')[1]
					if (i === undefined) return
					const index = parseInt(i)
					if (isNaN(index)) return
					if (type === 'PointLight' && index >= pLights.length) {
						this.lights.remove(item)
					}
				})
			}
		}
	}

	private initReflection() {
		const canvasSize = this.renderer.getSize(new THREE.Vector2())
		const reflectionWidth = Math.floor(canvasSize.width * (this.props.reflectionRatio ?? 1.0))
		const reflectionHeight = Math.floor(canvasSize.height * (this.props.reflectionRatio ?? 1.0))
		const reflectionTexture = new THREE.WebGLRenderTarget(reflectionWidth, reflectionHeight, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBFormat,
			stencilBuffer: false,
			// depthBuffer: false,
		})
		reflectionTexture.texture.generateMipmaps = false

		const reflectionTextureFXAA = new THREE.WebGLRenderTarget(reflectionWidth, reflectionHeight, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBFormat,
			stencilBuffer: false,
			depthBuffer: false,
		})
		reflectionTextureFXAA.texture.generateMipmaps = false

		const reflectionTextureRough = new THREE.WebGLRenderTarget(
			reflectionWidth / 2,
			reflectionHeight / 2,
			{
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBFormat,
				stencilBuffer: false,
				depthBuffer: false,
			}
		)
		reflectionTextureRough.texture.generateMipmaps = false

		const reflectionCamera = new THREE.PerspectiveCamera()
		reflectionCamera.layers.disable(0)
		reflectionCamera.layers.enable(1)
		reflectionCamera.name = 'reflectionCamera'

		// 基础场景绘制
		const drawPass = new Pass(
			{
				// width: reflectionWidth,
				// height: reflectionHeight,
				scene: this.scene,
				camera: reflectionCamera,
			},
			THREE
		)
		drawPass.setOutput(reflectionTexture)

		// FXAA
		const fxaaPass = new FXAAPass(
			{
				width: reflectionWidth,
				height: reflectionHeight,
			},
			THREE
		)
		fxaaPass.setInput(reflectionTexture)
		fxaaPass.setOutput(reflectionTextureFXAA)

		// 模糊
		const blurPass = new BlurPass(
			{
				width: reflectionWidth,
				height: reflectionHeight,
				kernel: 3,
			},
			THREE
		)
		blurPass.setInput(reflectionTextureFXAA)
		blurPass.setOutput(reflectionTextureRough)

		// Reflector
		const reflector = new THREE.Mesh(
			new THREE.PlaneBufferGeometry(0, 0.001, 1, 1),
			new THREE.ShaderMaterial({
				name: 'Polaris::reflector',
			})
		)
		reflector.name = 'reflectTimer(only for updating reflection)'
		reflector.renderOrder = -Infinity
		reflector.frustumCulled = false
		reflector.visible = this.props.enableReflection ?? false
		this.scene.add(reflector)

		const clipBias = 0
		const reflectorPlane = new THREE.Plane()
		const normal = new THREE.Vector3(0, 1, 0)
		const reflectorWorldPosition = new THREE.Vector3()
		const rotationMatrix = new THREE.Matrix4()
		const clipPlane = new THREE.Vector4()
		const viewport = new THREE.Vector4()
		const view = new THREE.Vector3()
		const q = new THREE.Vector4()
		const origin = new THREE.Vector3()
		const reflectionTexMatrix = new THREE.Matrix4()

		reflector.onBeforeRender = () => {
			const renderer = this.renderer
			const camera = this.camera
			// const cam = this.cam

			view.copy(camera.position)
			view.y = -view.y

			// 按照Polaris的相机设计，视野中心应该总是000，除非相机整体偏移
			// origin.y = -cam.altOffset

			rotationMatrix.extractRotation(camera.matrixWorld)

			reflectionCamera.position.copy(view)
			reflectionCamera.up.set(0, 1, 0)
			reflectionCamera.up.applyMatrix4(rotationMatrix)
			reflectionCamera.up.reflect(normal)
			reflectionCamera.lookAt(origin)

			// reflectionCamera.far = camera.far + SETTINGS.SKY_SPHERE_RADIUS - this.config.skylineOffset; // Used in WebGLBackground
			reflectionCamera.far = camera.far // Used in WebGLBackground
			reflectionCamera.near = camera.near // Used in WebGLBackground
			reflectionCamera.updateMatrixWorld()

			// 避免天空盒超出far的范围
			// @NOTE 在THREE中时调整天空盒的尺寸，适应camera的far，但是由于我们需要调整天空盒的位置（skylineOffset）, 不能调整天空盒的尺寸
			// @TODO
			// const oldFar = camera.far
			// camera.far += SETTINGS.SKY_SPHERE_RADIUS - this.config.skylineOffset
			// camera.updateProjectionMatrix()
			reflectionCamera.projectionMatrix.copy(camera.projectionMatrix)
			// camera.far = oldFar
			// camera.updateProjectionMatrix()

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

			const currentRenderTarget = renderer.getRenderTarget() as THREE.WebGLRenderTarget

			const currentVrEnabled = renderer.vr.enabled
			const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate

			// 反射过程中不计算阴影，节约性能
			const currCastShadow = this.props.castShadow
			// this.directionalLight.castShadow = false

			renderer.vr.enabled = false // Avoid camera modification and recursion
			renderer.shadowMap.autoUpdate = false // Avoid re-computing shadows

			// 天空盒位置调整
			// this.skylineAnchor.position.z = 0
			// this.skylineAnchor.position.y = this.skylineOffset
			// reflectionCamera.add(this.skylineAnchor)
			// this.skylineAnchor.updateMatrixWorld()
			// this.skySphere.matrixWorld.copyPosition(this.skylineAnchor.matrixWorld)
			// this.skySphere.matrixWorld.copyPosition(camera.matrixWorld)
			//

			// renderer.render( scene, reflectionCamera, this.reflectionTexture, true );
			renderer.autoClear = true
			drawPass.render(renderer)

			// this.directionalLight.castShadow = currCastShadow

			// blurPass.render(this.renderer, this.reflectionTexture, this.reflectionTextureBlur)
			renderer.autoClear = false
			// const _size = renderer.getSize()
			// this.renderer.setSize(512, 512, false)

			// composerFXAA.render()
			// composer.render()

			// this.pipeline.render()
			// NOTE TODO 不这样做的话似乎会有不clear的情况
			renderer.autoClear = true
			fxaaPass.render(renderer)
			this.renderer.autoClear = false
			blurPass.render(renderer)

			this.renderer.autoClear = true
			// this.renderer.setSize(_size.width, _size.height, false)

			renderer.vr.enabled = currentVrEnabled
			renderer.shadowMap.autoUpdate = currentShadowAutoUpdate
			renderer.setRenderTarget(currentRenderTarget)

			// Restore viewport
			const bounds = camera['bounds']

			if (bounds !== undefined) {
				const size = renderer.getSize(new THREE.Vector2())
				const pixelRatio = renderer.getPixelRatio()

				viewport.x = bounds.x * size.width * pixelRatio
				viewport.y = bounds.y * size.height * pixelRatio
				viewport.z = bounds.z * size.width * pixelRatio
				viewport.w = bounds.w * size.height * pixelRatio

				renderer.state.viewport(viewport)
			}
		}

		this.reflectionTexture = reflectionTexture
		this.reflectionTextureFXAA = reflectionTextureFXAA
		this.reflectionTextureRough = reflectionTextureRough
		this.reflectionDrawPass = drawPass
		this.reflectionFxaaPass = fxaaPass
		this.reflectionBlurPass = blurPass
		this.reflector = reflector
		this.reflectionTexMatrix = reflectionTexMatrix
	}

	/**
	 * 初始化后期处理
	 *
	 * @private
	 * @memberof GSIGL2Renderer
	 */
	private initPostprocessing() {
		this.props.renderToFBO = false

		const ppList = this.props.postprocessing
			? this.props.postprocessing.length > 0
				? this.props.postprocessing
				: undefined
			: undefined
		const antialiasing = this.props.antialias

		// if no pp & 'msaa', using hardware antialiasing
		if ((!antialiasing || antialiasing === 'msaa') && !ppList) {
			return
		}

		// If use pp aa -> disable webgl2 msaa, GL2
		this.frame['multisample'] = antialiasing === 'msaa' ? 4 : 0

		// dispose prev EffectComposer
		if (this.effectComposer) {
			this.effectComposer.dispose()
		}

		// Preparation
		patchLegacyPass()
		const passes = {}

		// EffectComposer
		const composer = (this.effectComposer = new EffectComposer(this.renderer, {
			// Bokeh需要depth
			depthBuffer: true,
			depthTexture: true,
		}))
		this.props.renderToFBO = true

		let aaPass
		const depthPasses: PolarisPass[] = [] // Depth passes should be rendered before aa pass
		const normalPasses: PolarisPass[] = [] // Normal passes should be rendered last

		// Render pass
		const frameBuffer = new ReadPass(this.frame)
		composer.addPass(frameBuffer)

		// AA pass
		if (antialiasing === 'smaa') {
			const SMAAPass = postprocessing['SMAAPass']
			const areaImage = new Image()
			areaImage.src = SMAAPass.areaImageDataURL
			const searchImage = new Image()
			searchImage.src = SMAAPass.searchImageDataURL
			aaPass = new SMAAPass(searchImage, areaImage)
			passes['SMAAPass'] = aaPass
		} else if (antialiasing === 'fxaa') {
			aaPass = new ShaderPass(genFXAAMaterial({ THREE }))
			aaPass.name = 'FXAAPass'
			aaPass.onViewChange = (cam) => {
				if (!this.renderer) return
				const drawingBufferSize = this.renderer.getDrawingBufferSize()
				const matr = aaPass.getFullscreenMaterial()
				matr.uniforms.resolution.value.set(drawingBufferSize.width, drawingBufferSize.height)
			}
			passes['FXAAPass'] = aaPass
		}

		if (!aaPass && !ppList) {
			return
		}

		// No more passes needed
		if (!ppList) {
			aaPass.renderToScreen = true
			composer.addPass(aaPass)
			return
		}

		// More passes needed
		if (aaPass) {
			aaPass.renderToScreen = false
		}

		// Process custom passes
		for (let i = 0; i < ppList.length; i++) {
			const { name, props } = ppList[i]
			const passName = name + 'Pass'
			let pass: PolarisPass
			if (passName === 'BokehPass' || passName === 'RealisticBokehPass') {
				// BokehPass needs depthTexture as input
				pass = new BokehPass()
				const uniforms = pass['uniforms']
				uniforms.tDepth.value = this.frame.depthTexture
				pass.onViewChange = (cam) => {
					if (!(props && props.autoFocus === false)) {
						uniforms.focus.value = cam.distance
					}
					if (!(props && props.autoDOF === false)) {
						uniforms.dof.value = cam.distance * 0.15
						uniforms.aperture.value = 1 / cam.distance
					}
					uniforms.cameraNear.value = this.props.cameraNear
					uniforms.cameraFar.value = this.props.cameraFar
				}
				depthPasses.push(pass)
			} else {
				if (!postprocessing[passName]) {
					console.error('[Polaris::Renderer-gsi-gl2] Invalid pass name')
					continue
				}
				if (Array.isArray(props)) {
					providePassArgs(props, {
						scene: this.scene,
						camera: this.camera,
					})
					pass = new postprocessing[passName](...props)
				} else {
					pass = new postprocessing[passName]({
						...props,
					})
				}
				normalPasses.push(pass)
			}

			// Attemp to set pass material.depthWrite
			if (pass.getFullscreenMaterial && pass.getFullscreenMaterial()) {
				pass.getFullscreenMaterial().depthWrite = !!props.depthWrite
			} else if (pass['setMaterialsProps']) {
				pass['setMaterialsProps']({
					depthWrite: !!props.depthWrite,
				})
			} else {
				// Do nothing
			}

			pass.enabled = !props.disabled
			passes[passName] = pass
		}

		// Add passes, order: aa -> depth -> normal passes
		if (aaPass) composer.addPass(aaPass)
		depthPasses.forEach((p) => {
			// Attemp to set scene depth, may not work as expected
			if (p.getFullscreenMaterial) {
				p.getFullscreenMaterial().uniforms.tDepth.value = this.frame.depthTexture
			}
			composer.addPass(p)
		})
		normalPasses.forEach((p) => composer.addPass(p))
		this.passes = passes

		// Set last pass .renderToScreen
		if (composer.passes.length > 0) {
			for (let i = composer.passes.length - 1; i >= 0; i--) {
				const pass = composer.passes[i]
				if (pass.enabled) {
					pass.renderToScreen = true
					break
				}
			}
		}
	}
}
