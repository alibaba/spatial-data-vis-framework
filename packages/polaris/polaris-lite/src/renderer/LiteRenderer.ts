/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import * as IR from '@gs.i/schema-scene'
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
import { colorToString, PolarisProps } from '@polaris.gl/base'
import { Renderer, GSIView } from '@polaris.gl/gsi'
import { ThreeLiteConverter } from '@gs.i/backend-threelite'
import { CameraProxy } from 'camera-proxy'
import * as SDK from '@gs.i/frontend-sdk'
import { calcCamNearFar } from './utils'
import { Raycaster } from '@gs.i/processor-raycast'
import type { MatProcessor } from '@gs.i/processor-matrix'
import type { BoundingProcessor } from '@gs.i/processor-bound'
import type { GraphProcessor } from '@gs.i/processor-graph'
import type { CullingProcessor } from '@gs.i/processor-culling'

/**
 *
 *
 * @export
 * @interface RendererProps
 * @extends {PolarisProps}
 */
export interface RendererProps
	extends Required<
		Pick<
			PolarisProps,
			| 'width'
			| 'ratio'
			| 'height'
			| 'antialias'
			| 'background'
			| 'fov'
			| 'viewOffset'
			| 'renderToFBO'
			| 'lights'
			| 'cameraNear'
			| 'cameraFar'
			| 'postprocessing'
		>
	> {
	enableReflection?: boolean
	reflectionRatio?: number
	castShadow?: boolean

	matrixProcessor: MatProcessor
	boundingProcessor: BoundingProcessor
	graphProcessor: GraphProcessor
	cullingProcessor: CullingProcessor
}

export const defaultProps = {
	enableReflection: false,
	reflectionRatio: 1.0,
	castShadow: false,
}

// Temp vars
const _vec3 = new Vector3()

/**
 *
 *
 * @export
 * @class LiteRenderer
 * @extends {Renderer}
 */
export class LiteRenderer extends Renderer {
	props: RendererProps

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
	// private reflectionTexture: WebGLRenderTarget
	// private reflectionTextureFXAA: WebGLRenderTarget
	// private reflectionTextureRough: WebGLRenderTarget
	// private reflectionDrawPass: Pass
	// private reflectionFxaaPass: Pass
	// private reflectionBlurPass: Pass
	// private reflector: Mesh
	// private reflectionTexMatrix: Matrix4

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
		this.conv = new ThreeLiteConverter({
			matrixProcessor: this.props.matrixProcessor,
			boundingProcessor: this.props.boundingProcessor,
			graphProcessor: this.props.graphProcessor,
			cullingProcessor: this.props.cullingProcessor,
		})

		/**
		 * init renderer
		 */
		const attributes: WebGLContextAttributes = {
			alpha: true,
			antialias: this.props.antialias === 'msaa',
			stencil: false,
		}

		this.renderer = new WebGLRenderer({
			canvas: this.canvas,
			// context: this.context,
			alpha: true,
			antialias: this.props.antialias === 'msaa',
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
		if (this.props.background === 'transparent') {
			this.scene.background = null
			this.renderer.setClearAlpha(0.0)
		} else {
			this.scene.background = new Color(this.props.background as string)
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
		const { cameraNear, cameraFar } = this.props
		this.camera = new PerspectiveCamera(
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
		// this.raycaster = new Raycaster({
		// 	boundingProcessor: this.props.boundingProcessor,
		// 	matrixProcessor: this.props.matrixProcessor,
		// })
		// this._internalThreeRaycaster = new ThreeRaycaster()

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

		if (this.props.renderToFBO) {
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

		this.props.width = width
		this.props.height = height

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
		// const reflectionWidth = Math.floor(canvasSize.width * (this.props.reflectionRatio ?? 1.0))
		// const reflectionHeight = Math.floor(canvasSize.height * (this.props.reflectionRatio ?? 1.0))
		// this.reflectionTexture.setSize(reflectionWidth, reflectionHeight)
		// this.reflectionTextureFXAA.setSize(reflectionWidth, reflectionHeight)
		// this.reflectionTextureRough.setSize(reflectionWidth / 2, reflectionHeight / 2)
		// this.reflectionDrawPass.resize(reflectionWidth, reflectionHeight)
		// this.reflectionFxaaPass.resize(reflectionWidth, reflectionHeight)
		// this.reflectionBlurPass.resize(reflectionWidth, reflectionHeight)
	}

	updateProps(props) {
		this.props = {
			...this.props,
			...props,
		}
		if (this.props.background === 'transparent') {
			this.scene.background = null
			this.renderer.setClearAlpha(0.0)
		} else {
			this.scene.background = new Color(this.props.background as string)
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
			// this.initPostprocessing()
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
				let aLight: AmbientLight = this.lights.getObjectByName(name) as AmbientLight
				if (!aLight) {
					aLight = new AmbientLight()
					this.lights.add(aLight)
				}
				if (this.props.lights.ambientLight.color) {
					aLight.color = new Color(colorToString(this.props.lights.ambientLight.color))
				}

				aLight.intensity = this.props.lights.ambientLight.intensity ?? 1.0
				aLight.name = name
				aLight.matrixAutoUpdate = false
			}
			if (this.props.lights.directionalLights) {
				const dLights = this.props.lights.directionalLights
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
			if (this.props.lights.pointLights) {
				const pLights = this.props.lights.pointLights
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
