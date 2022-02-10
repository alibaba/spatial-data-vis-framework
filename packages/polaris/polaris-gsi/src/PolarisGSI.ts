/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { isDISPOSED, MeshDataType } from '@gs.i/schema'
import { OptimizePass, GSIRefiner } from '@gs.i/utils-optimize'
import { HtmlView } from '@polaris.gl/view-html'
import { GSIView } from '@polaris.gl/view-gsi'
import {
	AbstractPolaris,
	PolarisProps,
	defaultProps as defaultPolarisProps,
	Renderer,
	Layer,
	PickEventResult,
	PickResult,
	CoordV2,
} from '@polaris.gl/base'
import { PointerControl, TouchControl } from 'camera-proxy'
import { isTouchDevice } from '@polaris.gl/utils'
import * as Projections from '@polaris.gl/projection'
import { StandardLayer } from '@polaris.gl/layer-std'
import Hammer from 'hammerjs'
import { throttle } from './Utils'

export interface PolarisGSIProps extends PolarisProps {
	enablePicking?: boolean
}

export const DefaultPolarisGSIProps: PolarisGSIProps = {
	...defaultPolarisProps,
	enablePicking: true,
}

export interface PolarisGSI extends AbstractPolaris {
	addOptimizePass(pass: OptimizePass): void
	addByProjection(layer: Layer, projectionType?: number, center?: number[]): void
}

export interface LayerPickEvent extends PickEventResult {
	layer: Layer
}

export class PolarisGSI extends AbstractPolaris implements PolarisGSI {
	readonly isPolarisGSI = true

	/**
	 * @todo should be accessible for polaris user. change this may have no effects.
	 */
	props: PolarisGSIProps

	/**
	 * top view layer
	 */
	view: {
		html: HtmlView
		gsi: GSIView
	}

	/**
	 * Renderer
	 */
	renderer: Renderer

	/**
	 * Scene optimization passes (executed before rendering)
	 */
	optimizePasses: OptimizePass[]

	/**
	 * pointer 事件封装
	 */
	private hammer

	/**
	 * Projection容器Layers
	 */
	private _projLayerWrappers: { [name: string]: Layer }

	/**
	 * Container resize listener
	 */
	private _resizeListener: any

	constructor(props: PolarisGSIProps) {
		super({
			...DefaultPolarisGSIProps,
			...props,
		})

		this.name = 'PolarisGSI'
		this.optimizePasses = []
		this.view = {
			html: new HtmlView(),
			gsi: new GSIView(),
		}
		for (const key in this.view) {
			this.view[key].init(this)
		}

		/**
		 * init html / canvas
		 */
		const container = this.props.container as HTMLDivElement

		// render html view
		this.view.html.element
		this.view.html.element.style.position = 'relative'
		this.view.html.element.style.width = this.width + 'px'
		this.view.html.element.style.height = this.height + 'px'
		this.view.html.element.style.overflow = 'hidden'
		this.view.html.element.className = 'polaris-wrapper'
		container.appendChild(this.view.html.element)

		// pointer 事件
		this._initPointerEvents()

		// 相机控制事件
		if (this.props.cameraControl) {
			if (isTouchDevice) {
				this.cameraControl = new TouchControl({
					camera: this.cameraProxy,
					element: this.view.html.element as HTMLElement,
				})
			} else {
				this.cameraControl = new PointerControl({
					camera: this.cameraProxy,
					element: this.view.html.element as HTMLElement,
				})
			}
			this.cameraControl.scale = 1.0 / (this.ratio ?? 1.0)
		}

		// Add optimize passes
		this.addOptimizePass(
			new GSIRefiner({
				frustumCulling: this.props.frustumCulling,
			})
		)

		// OptimizePasses会对SceneTree做更改，需排在第一个以便影响后续的Pass获取正确的场景信息
		const optimizeParams = {
			cameraPosition: {
				x: this.cameraProxy.position[0] - this.cameraProxy.center[0],
				y: this.cameraProxy.position[1] - this.cameraProxy.center[1],
				z: this.cameraProxy.position[2] - this.cameraProxy.center[2],
			},
			cameraRotation: {
				x: this.cameraProxy.rotationEuler[0],
				y: this.cameraProxy.rotationEuler[1],
				z: this.cameraProxy.rotationEuler[2],
			},
			cameraNear: this.props.cameraNear,
			cameraAspect: this.cameraProxy.aspect,
			cameraFOV: this.cameraProxy.fov,
			cameraFar: this.props.cameraFar,
		}
		this.onBeforeRender = () => {
			optimizeParams.cameraPosition.x = this.cameraProxy.position[0] - this.cameraProxy.center[0]
			optimizeParams.cameraPosition.y = this.cameraProxy.position[1] - this.cameraProxy.center[1]
			optimizeParams.cameraPosition.z = this.cameraProxy.position[2] - this.cameraProxy.center[2]
			optimizeParams.cameraRotation.x = this.cameraProxy.rotationEuler[0]
			optimizeParams.cameraRotation.y = this.cameraProxy.rotationEuler[1]
			optimizeParams.cameraRotation.z = this.cameraProxy.rotationEuler[2]
			optimizeParams.cameraNear = this.props.cameraNear
			optimizeParams.cameraAspect = this.cameraProxy.aspect
			optimizeParams.cameraFOV = this.cameraProxy.fov
			optimizeParams.cameraFar = this.props.cameraFar
			this.optimizePasses.forEach((pass) => pass.update(this.view.gsi.groupWrapper, optimizeParams))
		}

		/**
		 * Props listener
		 */

		// Renderer props update listener
		const rendererProps = [
			'background',
			'cameraNear',
			'cameraFar',
			'fov',
			'viewOffset',
			'lights',
			'postprocessing',
		]
		this.listenProps(rendererProps, () => {
			const newProps = {}
			for (let i = 0; i < rendererProps.length; i++) {
				const key = rendererProps[i]
				newProps[key] = this.getProps(key)
			}
			if (this.renderer) {
				this.cameraProxy.fov = newProps['fov']
				this.renderer.updateProps(newProps)
			}
		})

		// Responsive for container resize
		this.listenProps(['autoResize'], () => {
			const autoResize = this.getProps('autoResize')
			if (autoResize) {
				if (!this._resizeListener) {
					this._resizeListener = setInterval(() => {
						const width = container.clientWidth
						const height = container.clientHeight
						if (width !== this.width || height !== this.height) {
							this.resize(width, height, this.ratio, undefined)
							this.dispatchEvent({
								type: 'viewChange',
								cameraProxy: this.cameraProxy,
								polaris: this,
							})
						}
					}, 200)
				}
			} else if (this._resizeListener) {
				clearInterval(this._resizeListener)
				this._resizeListener = undefined
			}
		})
	}

	addOptimizePass(pass: OptimizePass) {
		if (this.optimizePasses.indexOf(pass) > -1) {
			console.warn('PolarisGSI - You try to repeatedly add an optimize pass')
			this.optimizePasses.splice(this.optimizePasses.indexOf(pass), 1)
		}
		this.optimizePasses.push(pass)
	}

	setRenderer(renderer: Renderer) {
		if (this.renderer) {
			throw new Error('PolarisGSI - 目前不支持动态替换 polaris 的 renderer')
		}

		this.renderer = renderer
		this.cameraProxy.config.onUpdate = (cam) => this.renderer.updateCamera(cam)
		this.cameraProxy['onUpdate'] = (cam) => this.renderer.updateCamera(cam)
		// 这里立刻update
		this.renderer.updateCamera(this.cameraProxy)
		this.renderer.resize(this.width, this.height, this.ratio)
		this.view.html.element.appendChild(this.renderer.canvas)
	}

	render() {
		if (!this.renderer) {
			throw new Error('PolarisGSI - Call .setRenderer() first. ')
		}
		// TODO 这里 不应该 允许 view 引用变化
		this.renderer.render(this.view.gsi)
	}

	capture() {
		if (!this.renderer) {
			throw new Error('PolarisGSI - Call .setRenderer() first. ')
		}
		this.tick()
		return this.renderer.capture()
	}

	/**
	 *
	 *
	 * @param {*} width
	 * @param {*} height
	 * @param {number} [ratio=1.0] 渲染像素比例，设置该值可渲染更低/更高分辨率图像
	 * @param {number} [externalScale=1.0] 外部设置的scale值，如style.transform等
	 * @memberof Polaris
	 */
	resize(width, height, ratio = 1.0, externalScale) {
		if (externalScale !== undefined) {
			console.warn('Polaris - Please use Polaris.setScale(scale) api. ')
		}

		super.resize(width, height, ratio, externalScale)

		this.view.html.element.style.width = this.width + 'px'
		this.view.html.element.style.height = this.height + 'px'

		if (this.renderer) {
			this.renderer.resize(width, height, ratio)
			this.renderer.updateCamera(this.cameraProxy)
		}

		this.traverse((obj) => {
			// obj._onViewChange.forEach((f) => f(this.cameraProxy, this))
			obj.dispatchEvent({
				type: 'viewChange',
				cameraProxy: this.cameraProxy,
				polaris: this,
			})
		})
	}

	/**
	 * 通过世界坐标获取屏幕像素坐标
	 * 以container的左上角为(0, 0)
	 * @backward_compatibility
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @return {*}  {number[]}
	 * @memberof PolarisGSI
	 */
	getScreenXY(x: number, y: number, z: number): number[] | undefined {
		const deviceCoords = this.renderer.getNDC({ x, y, z }, this.cameraProxy)

		for (let i = 0; i < deviceCoords.length; i++) {
			const item = deviceCoords[i]
			if (isNaN(item)) {
				return
			}
		}

		// Map to canvas coords
		return [
			Math.round((deviceCoords[0] + 1) * 0.5 * this.width),
			Math.round((deviceCoords[1] + 1) * 0.5 * this.height),
		]
	}

	/**
	 * 根据projection类型添加layer至相应layerWrapper中
	 *
	 * @param {Layer} layer
	 * @param {number} projectionType 0 - MercatorProjection | 1 - SphereProjection | 2 - EquirectangularProjectionPDC
	 * @param {[number, number]} center
	 * @memberof PolarisGSI
	 */
	addByProjection(layer: Layer, projectionType = 0, center: number[] = [0, 0]) {
		let projName
		switch (projectionType) {
			case 0:
				projName = 'MercatorProjection'
				break
			case 1:
				projName = 'SphereProjection'
				break
			case 2:
				projName = 'EquirectangularProjectionPDC'
				break
			case 3:
				projName = 'EquirectangularProjection'
				break
			case 4:
				projName = 'AzimuthalEquidistantProjection'
				break
			case 5:
				projName = 'GallStereoGraphicProjection'
				break
			default:
				throw new Error(`PolarisGSI - Invalid projectionType: ${projectionType}`)
		}

		if (Projections[projName] === undefined) {
			throw new Error(`PolarisGSI - Invalid projectionType: ${projectionType}`)
		}

		if (!this._projLayerWrappers) {
			this._projLayerWrappers = {}
		}

		const wrapperName = projName + '|' + center.toString()

		if (this._projLayerWrappers[wrapperName] === undefined) {
			this._projLayerWrappers[wrapperName] = new StandardLayer({
				parent: this,
				projection: new Projections[projName]({
					center,
				}),
			})
			this._projLayerWrappers[wrapperName].name = `Wrapper-${wrapperName}`
		}
		const wrapper = this._projLayerWrappers[wrapperName]
		wrapper.add(layer)
	}

	/**
	 * 射线命中测试
	 */
	pickObject(
		object: MeshDataType,
		ndcCoords: { x: number; y: number },
		options?: { allInters?: boolean; threshold?: number; backfaceCulling?: boolean }
	): PickResult {
		if (!this.renderer) {
			console.error('PolarisGSI - Call .setRenderer() first. ')
			return {
				hit: false,
			}
		}
		if (this.renderer.pick === undefined) {
			console.error('PolarisGSI - Renderer has no pick method implemented')
			return {
				hit: false,
			}
		}
		const geom = object.geometry
		if (
			!geom ||
			!geom.attributes ||
			!geom.attributes.position ||
			!geom.attributes.position.array ||
			isDISPOSED(geom.attributes.position.array) ||
			geom.attributes.position.count === 0
		) {
			// console.warn(
			// 	'PolarisGSI - Picking is skipped because mesh has no sufficient geometry info',
			// 	object
			// )
			return {
				hit: false,
			}
		}
		return this.renderer.pick(object, ndcCoords, options)
	}

	/**
	 * 对pickable并实现picking方法的layers进行pick操作
	 */
	pick(
		canvasCoords: CoordV2,
		options = { deepPicking: false }
	): LayerPickEvent | LayerPickEvent[] | undefined {
		const element = this.view.html.element
		const bbox = element.getBoundingClientRect()
		const left = bbox.left
		const top = bbox.top
		const width = element.clientWidth
		const height = element.clientHeight
		const ndc = {
			x: (canvasCoords.x / width) * 2 - 1,
			y: -(canvasCoords.y / height) * 2 + 1,
		}

		if (ndc.x < -1.0 || ndc.x > 1.0 || ndc.y < -1.0 || ndc.y > 1.0) {
			return
		}

		// Collect pick results
		const candidates: LayerPickEvent[] = []
		this.traverseVisible((obj) => {
			// @note pickable only exits on StandardLayer
			// @note do not bypass type check using props manager
			const layer = obj as StandardLayer
			if (layer.isStandardLayer && layer.getProps('pickable')) {
				if (!layer.raycast) {
					// console.warn('PolarisGSI - Layer does not implement raycast method. ')
					return
				}
				const layerRes = layer.raycast(this, canvasCoords, ndc)
				if (layerRes) {
					candidates.push({
						...layerRes,
						layer: layer,
						// pointer coords
						pointerCoords: {
							screen: { x: canvasCoords.x + left, y: canvasCoords.y + top },
							canvas: canvasCoords,
							ndc,
						},
					})
				}
			}
		})

		// Sort and get the closest picked layer
		if (candidates.length > 0) {
			candidates.sort(this._pickedLayerSortFn)
			if (options.deepPicking) {
				return candidates
			} else {
				return candidates[0]
			}
		}

		return
	}

	dispose() {
		this.cameraProxy.config.onUpdate = () => {}
		this.cameraProxy['onUpdate'] = () => {}

		if (this.renderer) {
			this.renderer.dispose()
		}

		// Remove event listeners
		this.hammer.off('tap')
		this.hammer.destroy()
		const element = this.view.html.element
		element.removeEventListener('mousemove', this._mouseMoveHandler)

		// Dispose layers
		this.traverse((base) => {
			base !== this && base.dispose && base.dispose()
		})

		this.children.forEach((child) => {
			this.remove(child)
		})

		if (this.view.html.element.parentElement) {
			this.view.html.element.parentElement.removeChild(this.view.html.element)
		}

		super.dispose()
	}

	/**
	 * 初始化pointer相关事件
	 *
	 * @private
	 * @memberof PolarisGSI
	 */
	private _initPointerEvents() {
		if (!this.props.enablePointer) return

		const element = this.view.html.element
		element.addEventListener('contextmenu', (e) => {
			e.preventDefault()
		})

		// Pointer event registration
		this.hammer = new Hammer.Manager(element)
		const tap = new Hammer.Tap({
			event: 'tap',
			pointers: 1,
			taps: 1,
		})
		this.hammer.add(tap)
		this.hammer.on('tap', (e) => {
			if (this.getProps('enablePicking')) {
				const bbox = element.getBoundingClientRect()
				const left = bbox.left
				const top = bbox.top
				const canvasCoords = { x: e.center.x - left, y: e.center.y - top }
				this._handlePointerEvent(canvasCoords, 'pick')
			}
		})

		// Use flag & timer to prevent [touchend, mousemove] linked events triggering
		let isTouched = false
		let lastTouchedTime = 0
		element.addEventListener('touchstart', () => (isTouched = true))
		element.addEventListener('touchend', () => {
			isTouched = false
			lastTouchedTime = this.timeline.currentTime
		})

		//
		let isMouseDown = false
		element.addEventListener('mousedown', () => (isMouseDown = true))
		element.addEventListener('mouseup', () => (isMouseDown = false))

		//
		let viewChangeTime = this.timeline.currentTime
		this.onViewChange = () => {
			viewChangeTime = this.timeline.currentTime
		}

		// Event callback throttling
		this._mouseMoveHandler = throttle(
			this.timeline.frametime,
			(e) => {
				// Disable hover when:
				// 1. device has been touched
				// 2. mouse has been pressed
				// 3. camera stable frames < N (default 2)
				// 4. lastTouchedTime < M (default 500ms)
				if (
					this.getProps('enablePicking') &&
					isTouched === false &&
					isMouseDown === false &&
					this.timeline.currentTime - viewChangeTime > this.timeline.frametime * 2 &&
					this.timeline.currentTime - lastTouchedTime > 500 // TODO: remove hardcode
				) {
					const bbox = element.getBoundingClientRect()
					const left = bbox.left
					const top = bbox.top
					const canvasCoords = { x: e.x - left, y: e.y - top }
					this._handlePointerEvent(canvasCoords, 'hover')
				}
			},
			this
		)
		element.addEventListener('mousemove', this._mouseMoveHandler)
	}

	private _mouseMoveHandler: (e: MouseEvent) => any

	private _handlePointerEvent(canvasCoords: CoordV2, triggerEventName: 'pick' | 'hover') {
		// Collect pick results
		const opts = { deepPicking: this.props.deepPicking ?? false }
		const result = this.pick(canvasCoords, opts)
		if (!result) {
			this.traverseVisible((obj) => {
				// @note pickable only exits on StandardLayer
				// @note do not bypass type check using props manager
				const layer = obj as StandardLayer
				if (layer.isStandardLayer && layer.getProps('pickable')) {
					// trigger non-picked layer with eventName & no arguments
					layer.dispatchEvent({ type: triggerEventName })
				}
			})
			return
		}

		if (Array.isArray(result)) {
			const resultArr = result
			const pickedLayers = resultArr.map((e) => e.layer)
			this.traverseVisible((obj) => {
				// @note pickable only exits on StandardLayer
				// @note do not bypass type check using props manager
				const layer = obj as StandardLayer
				const index = pickedLayers.indexOf(layer)
				if (layer.isStandardLayer && layer.getProps('pickable')) {
					if (index >= 0) {
						// trigger picked layer with eventName & result argument
						layer.dispatchEvent({ type: triggerEventName, result: resultArr[index] })
					} else {
						// trigger non-picked layer with eventName & no arguments
						layer.dispatchEvent({ type: triggerEventName })
					}
				}
			})
		} else {
			const resultEvent = result
			const pickedLayer = resultEvent.layer
			this.traverseVisible((obj) => {
				// @note pickable only exits on StandardLayer
				// @note do not bypass type check using props manager
				const layer = obj as StandardLayer
				if (layer.isStandardLayer && layer.getProps('pickable')) {
					if (layer === pickedLayer) {
						// trigger picked layer with eventName & result argument
						layer.dispatchEvent({ type: triggerEventName, result: resultEvent })
					} else {
						// trigger non-picked layer with eventName & no arguments
						layer.dispatchEvent({ type: triggerEventName })
					}
				}
			})
		}
	}

	/**
	 * 处理picking事件结果排序
	 */
	protected _pickedLayerSortFn(a: LayerPickEvent, b: LayerPickEvent): number {
		const meshA = a.object
		const meshB = b.object

		if (meshA === undefined || meshB === undefined) {
			return a.distance - b.distance
		}

		if (meshA.material !== undefined && meshB.material !== undefined) {
			// 1. Compare depthTest
			// if both are true, compare distance
			if (meshA.material.depthTest !== undefined && meshB.material.depthTest !== undefined) {
				if (meshA.material.depthTest === true && meshB.material.depthTest === true) {
					return a.distance - b.distance
				}
			}
			// 2. Compare transparent
			// transparent object is always rendered after non-transparent object
			else if (meshA.material['transparent'] === true && meshB.material['transparent'] === false) {
				return 1
			} else if (
				meshA.material['transparent'] === false &&
				meshB.material['transparent'] === true
			) {
				return -1
			}
		}
		// 3. Compare renderOrder
		// lower renderOrder => earlier to render => covered by higher renderOrder
		else if (
			meshA.renderOrder !== undefined &&
			meshB.renderOrder !== undefined &&
			meshA.renderOrder !== meshB.renderOrder
		) {
			return meshB.renderOrder - meshA.renderOrder
		}

		return a.distance - b.distance
	}
}
