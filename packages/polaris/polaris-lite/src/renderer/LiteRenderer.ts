/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import type * as IR from '@gs.i/schema-scene'
import {
	Object3D,
	Vector3,
	WebGLRenderer,
	WebGLRenderTarget,
	Scene,
	PerspectiveCamera,
	Color,
	LinearFilter,
	RGBAFormat,
	DepthTexture,
	Vector2,
	AmbientLight,
	DirectionalLight,
	PointLight,
} from 'three-lite'
import { Renderer, GSIView, PolarisGSIProps } from '@polaris.gl/gsi'
import { ThreeLiteConverter } from '@gs.i/backend-threelite'
import { CameraProxy } from 'camera-proxy'
import * as SDK from '@gs.i/frontend-sdk'
import { calcCamNearFar, colorToString } from './utils'
import { Raycaster } from '@gs.i/processor-raycast'

export type RendererConfig = {
	enableReflection?: boolean
	reflectionRatio?: number
	castShadow?: boolean
} & Required<
	Pick<
		PolarisGSIProps,
		| 'width'
		| 'height'
		| 'ratio'
		| 'antialias'
		| 'background'
		| 'fov'
		| 'viewOffset'
		| 'renderToFBO'
		| 'lights'
		| 'cameraNear'
		| 'cameraFar'
		| 'postprocessing'
		| 'matrixProcessor'
		| 'boundingProcessor'
		| 'graphProcessor'
		| 'cullingProcessor'
	>
>

export const defaultProps = {
	enableReflection: true,
	reflectionRatio: 1.0,
	castShadow: false,
}

export class LiteRenderer extends Renderer {
	private config: Required<RendererConfig>

	/**
	 * GSI - threelite 转换器
	 */
	conv: ThreeLiteConverter

	/**
	 * GL2 渲染器
	 */
	renderer: WebGLRenderer
	canvas: HTMLCanvasElement
	context: WebGLRenderingContext | null

	/**
	 * 外部进行后处理使用的 fbo
	 */
	frame: WebGLRenderTarget

	/**
	 * GSI - Scene 保留引用，应当不允许更改
	 * 每帧根据cameraProxy修改scene的偏移
	 */
	private polarisViewWrapper: IR.BaseNode

	/**
	 * 转换后的  group
	 */
	private threeRoot: Object3D

	/**
	 * used to do camera transformation for whole scene
	 */
	private rootWrapper: SDK.Mesh

	/**
	 * 顶层 scene，由 scene props 生成，在 polaris-renderer 中管理
	 */
	private scene: Scene

	/**
	 * 场景光源
	 */
	private lights: Object3D

	/**
	 * 场景相机
	 */
	camera: PerspectiveCamera

	/**
	 * Postprocessing
	 */
	effectComposer: any // postprocessing.EffectComposer
	passes: any // { [name: string]: PolarisPass }

	/**
	 * Picking
	 */
	raycaster: Raycaster

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
	reflectionTexture?: WebGLRenderTarget
	reflectionTextureRough?: WebGLRenderTarget
	// private reflectionTextureFXAA: WebGLRenderTarget
	// private reflectionDrawPass: Pass
	// private reflectionFxaaPass: Pass
	// private reflectionBlurPass: Pass
	// private reflector: Mesh
	// private reflectionTexMatrix: Matrix4

	constructor(props: RendererConfig) {
		super()

		this.config = {
			...defaultProps,
			...props,
		}

		/**
		 * @stage_0 MPV
		 */
		const canvasWidth = this.config.width * (this.config.ratio ?? 1.0)
		const canvasHeight = this.config.height * (this.config.ratio ?? 1.0)
		const canvas = document.createElement('canvas')
		canvas.width = canvasWidth
		canvas.height = canvasHeight
		canvas.style.position = 'absolute'
		canvas.style.left = '0px'
		canvas.style.top = '0px'
		canvas.style.width = this.config.width + 'px'
		canvas.style.height = this.config.height + 'px'
		this.canvas = canvas

		// Converter
		this.conv = new ThreeLiteConverter({
			matrixProcessor: this.config.matrixProcessor,
			boundingProcessor: this.config.boundingProcessor,
			graphProcessor: this.config.graphProcessor,
			cullingProcessor: this.config.cullingProcessor,
		})

		/**
		 * init renderer
		 */

		this.renderer = new WebGLRenderer({
			canvas: this.canvas,
			// context: this.context,
			alpha: true,
			antialias: this.config.antialias === 'msaa',
			stencil: false,
		})
		this.context = this.renderer.getContext()
		this.renderer.setClearAlpha(1.0)
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
		this.scene = new Scene()
		if (this.config.background === 'transparent') {
			this.scene.background = null
			this.renderer.setClearAlpha(0.0)
		} else {
			this.scene.background = new Color(this.config.background as string)
		}

		/**
		 * gsi three conv 不开启 decomposeMatrix ，不然性能很差。
		 * 这样做的问题是，conv 得到的 object3d 无法再 transform，即使加在 three.group 中，
		 * 也不会被父的 transform 影响。
		 */
		this.scene.autoUpdate = false
		this.scene.matrixAutoUpdate = false

		this.rootWrapper = new SDK.Mesh()
		this.rootWrapper.name = 'rootWrapper'

		/**
		 * init lights
		 */
		this.lights = new Object3D()
		this.lights.name = 'LightsWrapper'
		this.scene.add(this.lights)
		this.initLights()

		/**
		 * init Camera
		 * @note 整个 camera 的转换都放进 renderer 里，这里只提供 camera proxy
		 * 反正在哪里转都是一样的
		 */
		const { cameraNear, cameraFar } = this.config
		this.camera = new PerspectiveCamera(
			this.config.fov,
			this.config.width / this.config.height,
			cameraNear,
			cameraFar
		)
		this.camera.matrixAutoUpdate = false
		if (this.config.viewOffset) {
			this.camera.setViewOffset(
				this.config.width,
				this.config.height,
				this.config.viewOffset[0],
				this.config.viewOffset[1],
				this.config.viewOffset[2] ?? this.config.width,
				this.config.viewOffset[3] ?? this.config.height
			)
		}

		/**
		 * @stage_1 BI 需要
		 */

		/**
		 * @stage_2 只兼容桌面端，考虑是否放到 GL2 renderer 里，IE 是否需要？
		 */

		// init shadow

		// this.initReflection()

		// init pp
		this.frame = new WebGLRenderTarget(canvasWidth, canvasHeight, {
			minFilter: LinearFilter,
			magFilter: LinearFilter,
			format: RGBAFormat,
			stencilBuffer: false,
			depthBuffer: true,
		})
		this.frame.depthTexture = new (DepthTexture as any)()

		// this.initPostprocessing()
	}

	render(view: GSIView) {
		if (this.polarisViewWrapper === undefined) {
			this.polarisViewWrapper = view.alignmentWrapper
			this.rootWrapper.add(this.polarisViewWrapper)
		} else if (this.polarisViewWrapper !== view.alignmentWrapper) {
			throw new Error('Lite Renderer: Sharing renderer between polaris instances is not supported')
		}

		if (!this.threeRoot) {
			this.threeRoot = this.conv.convert(this.rootWrapper)
			this.scene.add(this.threeRoot)
		} else {
			this.conv.convert(this.rootWrapper)
		}

		if (this.config.renderToFBO) {
			// Postprocessing rendering
			this.renderer.setRenderTarget(this.frame)
			this.renderer.render(this.scene, this.camera)
			// this.effectComposer.render(this._clock.getDelta())
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

		this.config.width = width
		this.config.height = height

		this.renderer.setDrawingBufferSize(width, height, ratio)

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
		/**
		 * @strategy
		 *
		 * Move cam.center to 0,0,0
		 */

		this.rootWrapper.transform.position.set(-cam.center[0], -cam.center[1], -cam.center[2])
		this.camera.position.set(
			cam.position[0] - cam.center[0],
			cam.position[1] - cam.center[1],
			cam.position[2] - cam.center[2]
		)
		this.camera.rotation.fromArray(cam.rotationEuler)

		this.camera.updateMatrix()
		this.camera.updateMatrixWorld(true)

		// Update point lights position
		const pLights = this.config.lights?.pointLights
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
			this.camera.near = Math.max(near, this.config.cameraNear as number)
			this.camera.far = Math.min(far, this.config.cameraFar as number)
			this.camera.updateProjectionMatrix()
		}

		// Update postprocessing
		if (this.effectComposer) {
			// The drawing buffer size takes the device pixel ratio into account.
			const vec2 = new Vector2()
			const { width, height } = this.renderer.getDrawingBufferSize(vec2)
			this.frame.setSize(width, height)
			this.effectComposer.inputBuffer.setSize(width, height)
			this.effectComposer.outputBuffer.setSize(width, height)
			for (const pass of this.effectComposer.passes) {
				pass.setSize(width, height)
				pass.onViewChange && pass.onViewChange(cam)
			}
		}

		/** Update reflectionTexture */
		// const canvasSize = this.renderer.getSize(vec2)
		// const reflectionWidth = Math.floor(canvasSize.width * (this.config.reflectionRatio ?? 1.0))
		// const reflectionHeight = Math.floor(canvasSize.height * (this.config.reflectionRatio ?? 1.0))
		// this.reflectionTexture.setSize(reflectionWidth, reflectionHeight)
		// this.reflectionTextureFXAA.setSize(reflectionWidth, reflectionHeight)
		// this.reflectionTextureRough.setSize(reflectionWidth / 2, reflectionHeight / 2)
		// this.reflectionDrawPass.resize(reflectionWidth, reflectionHeight)
		// this.reflectionFxaaPass.resize(reflectionWidth, reflectionHeight)
		// this.reflectionBlurPass.resize(reflectionWidth, reflectionHeight)
	}

	updateConfig(props) {
		this.config = {
			...this.config,
			...props,
		}
		if (this.config.background === 'transparent') {
			this.scene.background = null
			this.renderer.setClearAlpha(0.0)
		} else {
			this.scene.background = new Color(this.config.background as string)
		}

		const canvasWidth = this.config.width * (this.config.ratio ?? 1.0)
		const canvasHeight = this.config.height * (this.config.ratio ?? 1.0)
		this.canvas.style.width = this.config.width + 'px'
		this.canvas.style.height = this.config.height + 'px'
		this.canvas.width = canvasWidth
		this.canvas.height = canvasHeight
		this.renderer.setSize(canvasWidth, canvasHeight)
		this.renderer.setViewport(0, 0, canvasWidth, canvasHeight)

		const { cameraNear, cameraFar, fov } = this.config
		this.camera.near = cameraNear as number
		this.camera.far = cameraFar as number
		this.camera.fov = fov as number
		this.camera.aspect = this.config.width / this.config.height
		if (this.config.viewOffset && this.config.viewOffset.length === 4) {
			this.camera.setViewOffset(
				this.config.width,
				this.config.height,
				this.config.viewOffset[0],
				this.config.viewOffset[1],
				this.config.viewOffset[2],
				this.config.viewOffset[3]
			)
		}
		this.camera.updateProjectionMatrix()

		this.initLights()

		if (this.config.postprocessing && this.config.postprocessing.length > 0) {
			/** @QianXun 目前先采用全部替换pass的方式来更新pp props */
			// this.initPostprocessing()
		} else {
			this.config.renderToFBO = false
			this.renderer.autoClear = true
		}
	}

	getNDC(worldPosition: { x: number; y: number; z: number }): number[] {
		return new Vector3(worldPosition.x, worldPosition.y, worldPosition.z)
			.project(this.camera)
			.toArray()
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
		if (this.config.lights) {
			// gltf to three
			if (this.config.lights.ambientLight) {
				const name = 'AmbientLight'
				let aLight: AmbientLight = this.lights.getObjectByName(name) as AmbientLight
				if (!aLight) {
					aLight = new AmbientLight()
					this.lights.add(aLight)
				}
				if (this.config.lights.ambientLight.color) {
					aLight.color = new Color(colorToString(this.config.lights.ambientLight.color))
				}

				aLight.intensity = this.config.lights.ambientLight.intensity ?? 1.0
				aLight.name = name
				aLight.matrixAutoUpdate = false
			}
			if (this.config.lights.directionalLights) {
				const dLights = this.config.lights.directionalLights
				dLights.forEach((item, index) => {
					const name = 'DirectionalLight.' + index
					let dlight: DirectionalLight = this.lights.getObjectByName(name) as DirectionalLight
					if (!dlight) {
						dlight = new DirectionalLight()
						this.lights.add(dlight)
					}
					if (item.color) {
						dlight.color = new Color(colorToString(item.color))
					}
					if (item.position) {
						dlight.position.copy(item.position as Vector3)
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
			if (this.config.lights.pointLights) {
				const pLights = this.config.lights.pointLights
				pLights.forEach((item, index) => {
					const name = 'PointLight.' + index
					let plight: PointLight = this.lights.getObjectByName(name) as PointLight
					if (!plight) {
						plight = new PointLight()
						this.lights.add(plight)
					}
					if (item.color) {
						plight.color = new Color(colorToString(item.color))
					}
					if (item.position) {
						plight.position.copy(item.position as Vector3)
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
}
