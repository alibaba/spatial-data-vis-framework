/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import {
	AbstractPolaris,
	PolarisProps,
	defaultProps as defaultPolarisProps,
	PickEventResult,
	CoordV2,
} from '@polaris.gl/base'
import { Renderer } from './Renderer'
import { PointerControl, TouchControl, Cameraman } from 'camera-proxy'
import { isTouchDevice } from '@polaris.gl/utils'
import { HtmlView, GSIView } from '../layer/index'
import type { StandardLayer } from '../layer/index'
import { MatProcessor } from '@gs.i/processor-matrix'
import { BoundingProcessor } from '@gs.i/processor-bound'
import { GraphProcessor } from '@gs.i/processor-graph'
import { CullingProcessor } from '@gs.i/processor-culling'
import { RenderableNode } from '@gs.i/schema-scene'
import { throttle, pickResultSorter } from './utils'
import { RaycastInfo } from '@gs.i/processor-raycast'

/**
 * @note safe to share globally @simon
 */
const defaultMatrixProcessor = new MatProcessor()
/**
 * @note safe to share globally @simon
 */
const defaultBoundingProcessor = new BoundingProcessor({
	matrixProcessor: defaultMatrixProcessor,
})
/**
 * @note safe to share globally @simon
 */
const defaultGraphProcessor = new GraphProcessor()
/**
 * @note safe to share globally @simon
 */
const defaultCullingProcessor = new CullingProcessor({
	boundingProcessor: defaultBoundingProcessor,
	matrixProcessor: defaultMatrixProcessor,
})

// override Node & EventDispatcher interfaces to hide underlying implements.
export interface PolarisGSI {
	get children(): Set<StandardLayer>
	add(child: StandardLayer): void
	remove(child: StandardLayer): void
	traverse(handler: (node: PolarisGSI | StandardLayer) => void): void
}

const defaultPolarisGSIProps = {
	...(defaultPolarisProps as Required<typeof defaultPolarisProps>),

	enablePicking: true,

	/**
	 * @note safe to share globally @simon
	 */
	matrixProcessor: defaultMatrixProcessor,
	/**
	 * @note safe to share globally @simon
	 */
	boundingProcessor: defaultBoundingProcessor,
	/**
	 * @note safe to share globally @simon
	 */
	graphProcessor: defaultGraphProcessor,
	/**
	 * @note safe to share globally @simon
	 */
	cullingProcessor: defaultCullingProcessor,
}

export type PolarisGSIProps = PolarisProps & Partial<typeof defaultPolarisGSIProps>

export abstract class PolarisGSI extends AbstractPolaris<PolarisGSIProps> {
	readonly isPolarisGSI = true

	/**
	 * top view layer
	 */
	declare view: {
		html: HtmlView
		gsi: GSIView
	}

	/**
	 * Renderer
	 */
	declare renderer: Renderer

	declare readonly cameraControl?: PointerControl | TouchControl
	declare readonly cameraman: Cameraman

	declare readonly matrixProcessor: MatProcessor
	declare readonly boundingProcessor: BoundingProcessor
	declare readonly graphProcessor: GraphProcessor
	declare readonly cullingProcessor: CullingProcessor

	/**
	 * Container resize listener
	 */
	private declare _resizeListener: any

	constructor(props: PolarisGSIProps) {
		const mergedProps = {
			...defaultPolarisGSIProps,
			...props,
		}
		super(mergedProps)

		this.matrixProcessor = mergedProps.matrixProcessor
		this.boundingProcessor = mergedProps.boundingProcessor
		this.graphProcessor = mergedProps.graphProcessor
		this.cullingProcessor = mergedProps.cullingProcessor

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
		const container = mergedProps.container as HTMLDivElement

		// render html view
		this.view.html.element
		this.view.html.element.style.position = 'relative'
		this.view.html.element.style.width = this.width + 'px'
		this.view.html.element.style.height = this.height + 'px'
		this.view.html.element.style.overflow = 'hidden'
		this.view.html.element.className = 'polaris-wrapper'
		container.appendChild(this.view.html.element)
		this.addEventListener('dispose', () => this.view.html.element.remove())

		// pointer 事件
		this._initPointerEvents()

		// 相机控制事件
		if (mergedProps.cameraControl) {
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

			this.addEventListener('dispose', () => this.cameraControl?.dispose())
		}

		/**
		 * Props listener
		 */

		// Responsive for container resize
		this.watchProps(
			['autoResize'],
			() => {
				const autoResize = this.getProp('autoResize')
				if (autoResize) {
					if (!this._resizeListener) {
						this._resizeListener = setInterval(() => {
							const width = container.clientWidth
							const height = container.clientHeight
							if (width !== this.width || height !== this.height) {
								this.resize(width, height, this.ratio)
							}
						}, 200)
					}
				} else if (this._resizeListener) {
					clearInterval(this._resizeListener)
					this._resizeListener = undefined
				}
			},
			true
		)

		// static props (shall not change these props)
		this.watchProps(
			['matrixProcessor', 'boundingProcessor', 'graphProcessor', 'cullingProcessor'],
			(e) => {
				const msg = `Do not modify static props: [${e.changedKeys.join(',')}]`
				this.dispatchEvent({ type: 'error', error: new Error(msg) })
				console.error(msg)
			}
		)
	}

	/**
	 * Method for a layer to perform a raycast test for its renderableNode
	 */
	abstract raycastRenderableNode(
		object: RenderableNode,
		ndcCoords: { x: number; y: number },
		options?: { allInters?: boolean }
	): RaycastInfo

	render() {
		if (!this.renderer) {
			throw new Error('PolarisGSI - set .renderer first. ')
		}
		this.renderer.render()
	}

	capture() {
		if (!this.renderer) {
			throw new Error('PolarisGSI - set .renderer first. ')
		}
		this.tick()
		return this.renderer.capture()
	}

	resize(
		width,
		height,
		/**
		 * 渲染像素比例，设置该值可渲染更低/更高分辨率图像
		 */
		ratio = 1.0
	) {
		super.resize(width, height, ratio)

		this.view.html.element.style.width = this.width + 'px'
		this.view.html.element.style.height = this.height + 'px'

		if (this.renderer) {
			this.renderer.resize(width, height, ratio)
			this.renderer.updateCamera(this.cameraProxy)
		}

		this.tick()
	}

	/**
	 * Set external scale (eg. HTMLElement.style.transform) and correct the camera control scale.
	 * @NOTE Make sure the external translation or scale has been set before calling this API
	 */
	setExternalScale(scale = 1.0) {
		if (this.cameraControl) {
			this.cameraControl.scale = scale / (this.ratio ?? 1.0)
		}
	}

	/**
	 * 通过世界坐标获取屏幕像素坐标
	 * 以container的左上角为(0, 0)
	 * @backward_compatibility
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
			(deviceCoords[0] + 1) * 0.5 * this.width, //
			(deviceCoords[1] + 1) * 0.5 * this.height, //
		]
	}

	dispose() {
		this.cameraProxy.config.onUpdate = () => {}
		this.cameraProxy['onUpdate'] = () => {}

		if (this.renderer) {
			this.renderer.dispose()
		}

		if (this._resizeListener) {
			clearInterval(this._resizeListener)
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
		if (!this.getProp('enablePointer')) return

		const element = this.view.html.element
		element.addEventListener('contextmenu', (e) => {
			e.preventDefault()
		})

		const onClick = (e: MouseEvent) => {
			if (this.getProp('enablePicking')) {
				const bbox = element.getBoundingClientRect()
				const left = bbox.left
				const top = bbox.top
				const canvasCoords = { x: e.x - left, y: e.y - top }
				this._handlePointerEvent(canvasCoords, 'pick')
			}
		}
		element.addEventListener('click', onClick)
		this.addEventListener('dispose', () => {
			element.removeEventListener('click', onClick)
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
		this.addEventListener('viewChange', () => {
			viewChangeTime = this.timeline.currentTime
		})

		// Throttle the hover reaction
		const mouseMoveHandler = throttle(
			this.timeline.frametime,
			(e) => {
				// Disable hover when:
				// 1. device has been touched
				// 2. mouse has been pressed
				// 3. camera stable frames < N (default 2)
				// 4. lastTouchedTime < M (default 500ms)
				if (
					this.getProp('enablePicking') &&
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
		element.addEventListener('mousemove', mouseMoveHandler)
		this.addEventListener('dispose', () => {
			element.removeEventListener('mousemove', mouseMoveHandler)
		})
	}

	private _handlePointerEvent(
		/**
		 * The canvas px coords, origin is on top left
		 */
		canvasCoords: CoordV2,
		/**
		 * The layer event name that should be triggered
		 */
		triggerEventName: 'pick' | 'hover'
	) {
		// Collect pick results
		const result = this._raycastLayers(canvasCoords, {
			deepPicking: this.getProp('deepPicking') ?? false,
		})

		// trigger non-picked layer with eventName & no arguments
		if (!result) {
			this.traverseVisible((obj) => {
				// @note pickable only exits on StandardLayer
				// @note do not bypass type check using props manager
				const layer = obj as StandardLayer
				if (layer.isStandardLayer && layer.getProp('pickable')) {
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
				// if (layer.isStandardLayer && layer.getProp('pickable')) {
				if (index >= 0) {
					// trigger picked layer with eventName & result argument
					layer.dispatchEvent({ type: triggerEventName, result: resultArr[index] })
				} else {
					// trigger non-picked layer with eventName & no arguments
					layer.dispatchEvent({ type: triggerEventName })
				}
				// }
			})
		} else {
			const resultEvent = result
			const pickedLayer = resultEvent.layer
			this.traverseVisible((obj) => {
				// @note pickable only exits on StandardLayer
				// @note do not bypass type check using props manager
				const layer = obj as StandardLayer
				// if (layer.isStandardLayer && layer.getProp('pickable')) {
				if (layer === pickedLayer) {
					// trigger picked layer with eventName & result argument
					layer.dispatchEvent({ type: triggerEventName, result: resultEvent })
				} else {
					// trigger non-picked layer with eventName & no arguments
					layer.dispatchEvent({ type: triggerEventName })
				}
				// }
			})
		}
	}

	private _raycastLayers(
		/**
		 * Canvas px coords, origin is on left top.
		 */
		canvasCoords: CoordV2,
		/**
		 * Picking options
		 */
		options = { deepPicking: false }
	): PickEventResult | PickEventResult[] | undefined {
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
		const candidates: PickEventResult[] = []
		this.traverseVisible((layer) => {
			// skip Polaris
			if (layer === this) {
				return
			}
			// @note check `pickable` inside `.raycast` method. instead of make it a props
			// since it is not only a prop. but also the type of the layer
			// if a layer doesn't support raycasting, leave it implemented
			const layerRes = layer.raycast(this, canvasCoords, ndc)
			if (layerRes) {
				candidates.push({
					...layerRes,
					layer: layer,
					pointerCoords: {
						screen: { x: canvasCoords.x + left, y: canvasCoords.y + top },
						canvas: canvasCoords,
						ndc,
					},
				})
			}
		})

		// Sort and get the closest picked layer
		if (candidates.length > 0) {
			candidates.sort(pickResultSorter)
			if (options.deepPicking) {
				return candidates
			} else {
				return candidates[0]
			}
		}

		return
	}
}
