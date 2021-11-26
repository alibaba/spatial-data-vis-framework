/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { MeshDataType } from '@gs.i/schema'
import {
	Object3D,
	Vector3,
	WebGLRenderer,
	Raycaster as ThreeRaycaster,
	WebGLRenderTarget,
	Clock,
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
import { Renderer, colorToString, PolarisProps, PickResult } from '@polaris.gl/schema'
import {
	DefaultConfig as ConvConfig,
	ThreeLiteConverter,
	RenderableObject3D,
} from '@gs.i/backend-threelite'
import { CameraProxy } from 'camera-proxy'
import * as SDK from '@gs.i/frontend-sdk'
import { GSIView } from '@polaris.gl/view-gsi'
// import * as postprocessing from 'postprocessing'
// const { EffectComposer, ShaderPass } = postprocessing
// import { BokehPass } from './passes/BokehPass'
// import { ReadPass } from './passes/ReadPass'
import { calcCamNearFar } from './Utils'
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

// export interface PolarisPass extends postprocessing.Pass {
// 	onViewChange?: (cam: CameraProxy) => void
// }

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

	private _clock: Clock

	/**
	 * GSI - Scene 保留引用，应当不允许更改
	 * 每帧根据cameraProxy修改scene的偏移
	 */
	private gsiScene: SDK.Mesh

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
	private camera: PerspectiveCamera

	/**
	 * 转换后的 GL2 group
	 */
	private _group: RenderableObject3D

	/**
	 * Postprocessing
	 */
	effectComposer: any // postprocessing.EffectComposer
	passes: any // { [name: string]: PolarisPass }

	/**
	 * Picking
	 */
	raycaster: Raycaster
	private _internalThreeRaycaster: ThreeRaycaster

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
		const canvas = document.createElement('canvas')
		canvas.style.position = 'absolute'
		canvas.style.left = '0px'
		canvas.style.top = '0px'
		canvas.style.width = this.props.width + 'px'
		canvas.style.height = this.props.height + 'px'
		canvas.width = this.props.width
		canvas.height = this.props.height
		this.canvas = canvas

		// Converter
		this.conv = new ThreeLiteConverter(ConvConfig)

		/**
		 * init renderer
		 */
		const attributes: WebGLContextAttributes = {
			alpha: true,
			antialias: this.props.antialias === 'msaa',
			stencil: false,
		}
		this.context = canvas.getContext('webgl', attributes)
		if (!this.context) {
			throw new Error('GSILiteRenderer - Cannot get WebGLRenderingContext. ')
		}

		this.renderer = new WebGLRenderer({
			canvas: this.canvas,
			context: this.context,
			alpha: true,
			antialias: this.props.antialias === 'msaa',
			stencil: false,
		})
		this.renderer.setClearAlpha(1.0)
		/** @FIXME gamma correction未生效 */
		// this.renderer.gammaOutput = true
		// this.renderer.gammaFactor = 2.2

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
		// 在scene optimize pass中主动计算matrix，不需要three的计算了
		this.scene.autoUpdate = false
		this.scene.matrixAutoUpdate = false

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
		this.raycaster = new Raycaster()
		this._internalThreeRaycaster = new ThreeRaycaster()

		/**
		 * @stage_2 只兼容桌面端，考虑是否放到 GL2 renderer 里，IE 是否需要？
		 */

		// init shadow

		// this.initReflection()

		// init pp
		this.frame = new WebGLRenderTarget(this.props.width, this.props.height, {
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
		if (!this._group) {
			this._group = this.conv.convert(view.groupWrapper)
			this.scene.add(this._group)
		} else {
			this.conv.convert(view.groupWrapper)
		}

		// 缓存
		if (this.gsiScene !== view.groupWrapper) {
			this.gsiScene = view.groupWrapper
		}

		if (this.props.renderToFBO) {
			// Postprocessing rendering
			this.renderer.setRenderTarget(this.frame)
			this.renderer.render(this.scene, this.camera)
			if (!this._clock) {
				this._clock = new Clock()
				this._clock.start()
			}
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

		this.canvas.style.width = this.props.width + 'px'
		this.canvas.style.height = this.props.height + 'px'
		this.canvas.width = this.props.width
		this.canvas.height = this.props.height
		this.renderer.setSize(this.props.width, this.props.height)
		this.renderer.setViewport(0, 0, this.props.width, this.props.height)

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
			intersections: [],
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
				`Polaris::GSIGL2Renderer - Geometry mode '${object.geometry.mode}' not supported for picking yet. `
			)
			return result
		}

		if (info.hit) {
			return info
		}
		return result
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

	/**
	 * 初始化后期处理
	 *
	 * @private
	 * @memberof GSIGL2Renderer
	 */
	// private initPostprocessing() {
	// 	this.props.renderToFBO = false

	// 	const ppList = this.props.postprocessing
	// 		? this.props.postprocessing.length > 0
	// 			? this.props.postprocessing
	// 			: undefined
	// 		: undefined
	// 	const antialiasing = this.props.antialias

	// 	// if no pp & 'msaa', using hardware antialiasing
	// 	if ((!antialiasing || antialiasing === 'msaa') && !ppList) {
	// 		return
	// 	}

	// 	// If use pp aa -> disable webgl2 msaa, GL2
	// 	this.frame['multisample'] = antialiasing === 'msaa' ? 4 : 0

	// 	// dispose prev EffectComposer
	// 	if (this.effectComposer) {
	// 		this.effectComposer.dispose()
	// 	}

	// 	// Preparation
	// 	const passes = {}

	// 	// EffectComposer
	// 	const composer = (this.effectComposer = new EffectComposer(this.renderer, {
	// 		// Bokeh需要depth
	// 		depthBuffer: true,
	// 		depthTexture: true,
	// 	}))
	// 	this.props.renderToFBO = true

	// 	let aaPass
	// 	const depthPasses: PolarisPass[] = [] // Depth passes should be rendered before aa pass
	// 	const normalPasses: PolarisPass[] = [] // Normal passes should be rendered last

	// 	// Render pass
	// 	const frameBuffer = new ReadPass(this.frame)
	// 	composer.addPass(frameBuffer)

	// 	// AA pass
	// 	if (antialiasing === 'smaa') {
	// 		const SMAAPass = postprocessing['SMAAPass']
	// 		const areaImage = new Image()
	// 		areaImage.src = SMAAPass.areaImageDataURL
	// 		const searchImage = new Image()
	// 		searchImage.src = SMAAPass.searchImageDataURL
	// 		aaPass = new SMAAPass(searchImage, areaImage)
	// 		passes['SMAAPass'] = aaPass
	// 	} else if (antialiasing === 'fxaa') {
	// 		aaPass = new ShaderPass(genFXAAMaterial({ THREE }))
	// 		aaPass.name = 'FXAAPass'
	// 		aaPass.onViewChange = (cam) => {
	// 			if (!this.renderer) return
	// 			const drawingBufferSize = this.renderer.getDrawingBufferSize()
	// 			const matr = aaPass.getFullscreenMaterial()
	// 			matr.uniforms.resolution.value.set(drawingBufferSize.width, drawingBufferSize.height)
	// 		}
	// 		passes['FXAAPass'] = aaPass
	// 	}

	// 	if (!aaPass && !ppList) {
	// 		return
	// 	}

	// 	// No more passes needed
	// 	if (!ppList) {
	// 		aaPass.renderToScreen = true
	// 		composer.addPass(aaPass)
	// 		return
	// 	}

	// 	// More passes needed
	// 	if (aaPass) {
	// 		aaPass.renderToScreen = false
	// 	}

	// 	// Process custom passes
	// 	for (let i = 0; i < ppList.length; i++) {
	// 		const { name, props } = ppList[i]
	// 		const passName = name + 'Pass'
	// 		let pass: PolarisPass
	// 		if (passName === 'BokehPass' || passName === 'RealisticBokehPass') {
	// 			// BokehPass needs depthTexture as input
	// 			pass = new BokehPass()
	// 			const uniforms = pass['uniforms']
	// 			uniforms.tDepth.value = this.frame.depthTexture
	// 			pass.onViewChange = (cam) => {
	// 				if (!(props && props.autoFocus === false)) {
	// 					uniforms.focus.value = cam.distance
	// 				}
	// 				if (!(props && props.autoDOF === false)) {
	// 					uniforms.dof.value = cam.distance * 0.15
	// 					uniforms.aperture.value = 1 / cam.distance
	// 				}
	// 				uniforms.cameraNear.value = this.props.cameraNear
	// 				uniforms.cameraFar.value = this.props.cameraFar
	// 			}
	// 			depthPasses.push(pass)
	// 		} else {
	// 			if (!postprocessing[passName]) {
	// 				console.error('[Polaris::Renderer-gsi-gl2] Invalid pass name')
	// 				continue
	// 			}
	// 			if (Array.isArray(props)) {
	// 				providePassArgs(props, {
	// 					scene: this.scene,
	// 					camera: this.camera,
	// 				})
	// 				pass = new postprocessing[passName](...props)
	// 			} else {
	// 				pass = new postprocessing[passName]({
	// 					...props,
	// 				})
	// 			}
	// 			normalPasses.push(pass)
	// 		}

	// 		// Attemp to set pass material.depthWrite
	// 		if (pass.getFullscreenMaterial()) {
	// 			pass.getFullscreenMaterial().depthWrite = !!props.depthWrite
	// 		} else if (pass['setMaterialsProps']) {
	// 			pass['setMaterialsProps']({
	// 				depthWrite: !!props.depthWrite,
	// 			})
	// 		} else {
	// 			// Do nothing
	// 		}

	// 		pass.enabled = !props.disabled
	// 		passes[passName] = pass
	// 	}

	// 	// Add passes, order: aa -> depth -> normal passes
	// 	if (aaPass) composer.addPass(aaPass)
	// 	depthPasses.forEach((p) => {
	// 		// Attemp to set scene depth, may not work as expected
	// 		if (p.getFullscreenMaterial()) {
	// 			p.getFullscreenMaterial().uniforms.tDepth.value = this.frame.depthTexture
	// 		}
	// 		composer.addPass(p)
	// 	})
	// 	normalPasses.forEach((p) => composer.addPass(p))
	// 	this.passes = passes

	// 	// Set last pass .renderToScreen
	// 	if (composer.passes.length > 0) {
	// 		for (let i = composer.passes.length - 1; i >= 0; i--) {
	// 			const pass = composer.passes[i]
	// 			if (pass.enabled) {
	// 				pass.renderToScreen = true
	// 				break
	// 			}
	// 		}
	// 	}
	// }
}
