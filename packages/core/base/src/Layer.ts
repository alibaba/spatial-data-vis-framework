/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import type { Projection } from '@polaris.gl/projection'
import type { Timeline } from 'ani-timeline'
import type { CameraProxy } from 'camera-proxy'
import type { AbstractLayerEvents } from './events'

import { MAX_DEPTH, Node } from './Node'
import type { AbstractPolaris } from './Polaris'
import { Callback, ListenerOptions, PropsManager } from '@polaris.gl/props-manager'

export interface LayerProps {
	name?: string
	timeline?: Timeline
	projection?: Projection
}

// override Node & EventDispatcher interfaces to hide underlying implements.
export interface AbstractLayer {
	get parent(): AbstractLayer | null
	get children(): Set<AbstractLayer>
	get root(): AbstractLayer | null
	add(child: AbstractLayer): void
	remove(child: AbstractLayer): void
	traverse(handler: (node: AbstractLayer) => void): void
	set onAdd(f: (parent: any) => void) // workaround ts bug
	set onRemove(f: (parent: any) => void)
}

/**
 * empty layer
 */
export abstract class AbstractLayer<
	TProps extends LayerProps = any,
	TExtraEventMap extends AbstractLayerEvents = AbstractLayerEvents
> extends Node<TExtraEventMap> {
	/**
	 * type indicator
	 */
	readonly isAbstractLayer = true
	/**
	 * readable name of this layer
	 */
	readonly name: string

	#inited = false
	#visible = true
	#propsManager = new PropsManager<TProps>()

	// 本地传入
	#timelineLocal?: Timeline
	#projectionLocal?: Projection

	/**
	 * @constructor
	 * @param props
	 */
	constructor(props?: TProps) {
		super()

		this.name = props?.name || 'abstract-layer'

		// 本地投影和时间线
		this.#projectionLocal = props?.projection
		this.#timelineLocal = props?.timeline

		this.setProps(props || {})

		/**
		 * InitEvent
		 *
		 * Emit when this layer is added to a polaris tree (a layer tree whose root is a polaris instance)
		 * Once inited, the parent-chain of this layer won't change again.
		 */
		this.addEventListener('rootChange', (e) => {
			// @note: When a layer is removed. Child layers will get RootChangeEvent. This warning is useless.
			// if (this.#inited && e.root !== null) {
			// 	const msg = 'InternalError: This layer has already been inited. cannot move a layer'
			// 	console.error(msg)
			// 	this.dispatchEvent({ type: 'error', error: new Error('msg') })
			// 	return
			// }

			// if (isPolaris(e.root)) {
			if (e.root?.['isPolaris']) {
				// settle the projection for this layer
				const projection = resolveProjection(this) as Projection
				// settle the timeline for this layer
				const timeline = resolveTimeline(this) as Timeline
				// settle the polaris for this layer
				const polaris = e.root as AbstractPolaris

				// set this before trigger event.
				// because this may be used in InitEvent listeners
				this.#inited = true

				this.init && this.init(projection, timeline, polaris)

				this.dispatchEvent({
					type: 'init',
					projection,
					timeline,
					polaris,
				})

				this.dispatchEvent({
					type: 'afterInit',
					projection,
					timeline,
					polaris,
				})
			}
		})
	}

	/**
	 * whether this layer had been inited (added to an polaris tree and triggered InitEvent)
	 */
	get inited() {
		return this.#inited
	}

	/**
	 * visibility of this layer
	 */
	get visible() {
		return this.#visible
	}

	set visible(v: boolean) {
		if (this.#visible !== v) {
			this.#visible = v
			this.dispatchEvent({ type: 'visibilityChange', visible: v })
		}
	}

	get localProjection(): Projection | undefined {
		return this.#projectionLocal
	}

	get localTimeline(): Timeline | undefined {
		return this.#timelineLocal
	}

	/**
	 * optional raycast implement.
	 * don't implement this if this layer doesn't support raycast
	 * @param polaris
	 * @param canvasCoord
	 * @param ndc
	 */
	abstract raycast(
		polaris: AbstractPolaris,
		canvasCoord: CoordV2,
		ndc: CoordV2
	): PickInfo | undefined

	dispose() {
		// trigger before deconstruction incase use needs some of them in the callback
		this.dispatchEvent({ type: 'dispose' })

		// @todo Is it necessary?
		// this.#propsManager.dispose()
		// this.removeAllEventListeners()
	}

	/**
	 * update geographic alignment matrix
	 *
	 * this matrix align this layer's geographic space to parent's.
	 */
	abstract updateAlignmentMatrix(matrix: number[]): void

	show() {
		this.visible = true
	}
	hide() {
		this.visible = false
	}

	getProp<TKey extends keyof TProps>(key: TKey): TProps[TKey] {
		return this.#propsManager.get(key)
	}

	/**
	 * listen to changes of a series of props.
	 * @note callback will be fired if any of these keys changed
	 * @note event.props only contains changed keys.
	 */
	watchProps<TKeys extends ReadonlyArray<keyof TProps>>(
		keys: TKeys,
		callback: Callback<Partial<TProps>, TKeys[number]>,
		options?: ListenerOptions
	): void {
		this.#propsManager.addListener(keys, callback, options)
	}

	watchProp<TKey extends keyof TProps>(
		key: TKey,
		callback: Callback<TProps, TKey>,
		options?: ListenerOptions
	): void {
		this.#propsManager.addListener([key], callback, options)
	}

	setProps(props: Partial<TProps | LayerProps>) {
		this.#propsManager.set(props as any)
	}

	traverseVisible(handler: (node: AbstractLayer<any /* do not assume generic */>) => void): void {
		if (!this.visible) return

		handler(this)
		this.children.forEach((child) => {
			child.traverseVisible(handler)
		})
	}

	resolveTimeline() {
		return resolveTimeline(this)
	}
	resolveProjection() {
		return resolveProjection(this)
	}

	// #region legacy apis

	/**
	 * @deprecated use {@link isAbstractLayer}
	 */
	readonly isBase = true
	/**
	 * @deprecated use {@link isAbstractLayer}
	 */
	readonly isLayer = true

	/**
	 * @deprecated use {@link .addEventListener} instead
	 * callback when object/layer
	 */
	set onVisibilityChange(f: (visible: boolean) => void) {
		this.addEventListener('visibilityChange', (e) => {
			f(e.visible)
		})
	}

	/**
	 * @deprecated use {@link .addEventListener} instead
	 */
	protected set afterInit(
		f: (projection: Projection, timeline: Timeline, polaris: AbstractPolaris) => void
	) {
		this.addEventListener('afterInit', (event) => {
			f(event.projection, event.timeline, event.polaris)
		})
	}

	/**
	 * @deprecated use {@link .addEventListener} instead
	 * callbacks when any object/layer has been picked by user pointer
	 */
	set onPicked(f: (event: PickEventResult | undefined) => void) {
		this.addEventListener('pick', (event) => {
			f(event.result)
		})
	}

	/**
	 * @deprecated use {@link .addEventListener} instead
	 * callbacks when any object/layer has been hovered on by user pointer
	 */
	set onHovered(f: (event: PickEventResult | undefined) => void) {
		this.addEventListener('hover', (event) => {
			f(event.result)
		})
	}

	/**
	 * @deprecated use addEventListener('init')
	 */
	set onInit(f: (projection: Projection, timeline: Timeline, polaris: AbstractPolaris) => void) {
		this.addEventListener(
			'init',
			(event) => {
				f(event.projection, event.timeline, event.polaris)
			},
			{ once: true }
		)
	}

	/**
	 * update props
	 * @todo whether rename to setProps?
	 * @deprecated
	 */
	updateProps = this.setProps

	/**
	 * @deprecated use {@link watchProps} instead. with `{immediate: true}` as options
	 */
	protected listenProps<TKeys extends ReadonlyArray<keyof TProps>>(
		keys: TKeys,
		callback: Callback<TProps, TKeys[number]>
	): void {
		this.#propsManager.addListener(keys, callback, { immediate: true })
	}

	/**
	 * @deprecated use {@link getProp} instead
	 */
	protected getProps = this.getProp

	/**
	 * @deprecated use {@link .addEventListener} instead
	 * callback when camera state is changed
	 */
	set onViewChange(f: (cam: CameraProxy, polaris: any /* typeof Polaris */) => void) {
		this.addEventListener('viewChange', (event) => {
			f(event.cameraProxy, event.polaris)
		})
	}

	/**
	 * @deprecated use {@link .addEventListener} instead
	 * callback before object/layer to be rendered in every frame
	 */
	set onBeforeRender(f: (polaris: any /* typeof Polaris */) => void) {
		this.addEventListener('beforeRender', (event) => {
			f(event.polaris)
		})
	}

	/**
	 * @deprecated use {@link .addEventListener} instead
	 * callback after object/layer rendered in every frame
	 */
	set onAfterRender(f: (polaris: any /* typeof Polaris */) => void) {
		this.addEventListener('afterRender', (event) => {
			f(event.polaris)
		})
	}

	/**
	 * @deprecated use {@link .addEventListener} instead
	 *
	 * Initialization entry
	 *
	 * you can use this.timeline, this.projection and polaris safely
	 *
	 * exactly same effect as this.addEventListener('init')
	 *
	 * @alias this.addEventListener('init')
	 */
	init?(projection: Projection, timeline: Timeline, polaris: AbstractPolaris): void
	// #endregion
}

export function isAbstractLayer(v: any): v is AbstractLayer
export function isAbstractLayer(v: AbstractLayer): v is AbstractLayer {
	return v.isAbstractLayer && v.isNode && v.isEventDispatcher
}
export const isLayer = isAbstractLayer

export const Layer = AbstractLayer

export function isInited(v: AbstractLayer): v is AbstractLayer & { inited: true } {
	return v.inited
}

//

export interface CoordV2 {
	x: number
	y: number
}

export interface CoordV3 {
	x: number
	y: number
	z: number
}

export interface PickInfo {
	/**
	 * 碰撞点与视点距离
	 */
	distance: number

	/**
	 * data item 索引
	 */
	index: number

	/**
	 * 碰撞点世界坐标
	 */
	point: CoordV3

	/**
	 * 碰撞点本地坐标
	 */
	pointLocal: CoordV3

	/**
	 * Layer specific mesh object
	 */
	object: any

	/**
	 * Layer specific
	 */
	data?: any
}

export interface PickEventResult extends PickInfo {
	layer: AbstractLayer

	pointerCoords: {
		canvas: CoordV2
		ndc: CoordV2
		screen: CoordV2
	}
}

const resolvedTimeline = new WeakMap<AbstractLayer, Timeline | null>()
const resolvedProjection = new WeakMap<AbstractLayer, Projection | null>()

/**
 * resolve timeline for a layer
 *
 * search the parent-chain all the way up to root, until find a timeline instance
 */
export function resolveTimeline(layer: AbstractLayer) {
	const cached = resolvedTimeline.get(layer)
	if (cached) return cached

	let depth = 0
	let currentLayer: AbstractLayer | null = layer
	while (depth < MAX_DEPTH) {
		if (currentLayer) {
			const t = currentLayer.localTimeline
			if (t) {
				resolvedTimeline.set(layer, t)
				return t
			} else {
				currentLayer = currentLayer.parent
				depth++
			}
		} else {
			resolvedTimeline.set(layer, null)
			return null
			// throw new Error('resolveTimeline: cannot find timeline in the whole parent tree.')
		}
	}
	throw new Error('resolveTimeline: MAX_DEPTH exceeded')
}

/**
 * resolve projection for a layer
 *
 * search the parent-chain all the way up to root, until find a projection instance
 */
export function resolveProjection(layer: AbstractLayer) {
	const cached = resolvedProjection.get(layer)
	if (cached) return cached

	let depth = 0
	let currentLayer: AbstractLayer | null = layer
	while (depth < MAX_DEPTH) {
		if (currentLayer) {
			const p = currentLayer.localProjection
			if (p) {
				resolvedProjection.set(layer, p)
				return p
			} else {
				currentLayer = currentLayer.parent
				depth++
			}
		} else {
			resolvedProjection.set(layer, null)
			return null
			// throw new Error('resolveProjection: cannot find projection in the whole parent tree.')
		}
	}
	throw new Error('resolveProjection: MAX_DEPTH exceeded')
}

// test code
// const a = new Layer()
// a.parent

/**
 * @todo always needs to override .setProps(Partial<TProps | LayerProps>)
 * @note feels like a bug of tsc
 * @note
 * Partial<TProps> is not `assignable` until generic type TProps get settled.
 * So if you use Partial<GenericType> as a writeable value or function param.
 * Use `.t3` like the following code:
 *
 * ```
 * class A<T extends { s: boolean }> {
 * 		t1: T
 * 		t2: Partial<T>
 * 		t3: Partial<T | { s: boolean }>
 *
 * 		set() {
 * 			// write
 * 			this.t1 = { s: true } // ❌ TS Error
 * 			this.t2 = { s: true } // ❌ TS Error <- this should pass
 * 			this.t3 = { s: true } // ✅ TS Pass
 * 			this.t3 = { l: true } // ❌ TS Error
 *
 * 			// read
 *			this.t1.s // boolean
 *			this.t2.s // boolean | undefined
 *			this.t3.s // boolean | undefined
 * 		}
 * }
 *
 * class B extends A<{ l?: boolean; s: boolean }> {
 * 		set() {
 * 			this.t1 = { s: true } // ✅ TS Pass
 * 			this.t2 = { s: true } // ✅ TS Pass
 * 			this.t3 = { s: true } // ✅ TS Pass
 * 			this.t3 = { l: true } // ✅ TS Pass
 * 		}
 * }
 * ```
 */
