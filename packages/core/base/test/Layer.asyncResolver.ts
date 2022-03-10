/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import type { Projection } from '@polaris.gl/projection'
import type { Timeline } from 'ani-timeline'
import type { CameraProxy } from 'camera-proxy'
import type { AbstractLayerEvents } from './events'

import { Node } from './Node'
import { View } from './View'
import { AbstractPolaris, isPolaris } from './Polaris'
import { Callback, ListenerOptions, PropsManager } from '@polaris.gl/utils-props-manager'

export interface LayerProps {
	name?: string
	parent?: AbstractLayer<any>
	timeline?: Timeline
	projection?: Projection
	views?: { [key: string]: new () => View }
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
	/**
	 * #### The actual renderable contents.
	 * A layer can have multi views, e.g. gsiView + htmlView
	 *
	 * 🚧 @note
	 * - kind of over-design. name and interface may change into future.
	 * - this is for framework developers to add third-party renderers.
	 * - should not be exposed to client developers.
	 * - **only use this if you know what you are doing.**
	 */
	readonly view: { [key: string]: View }

	#inited = false
	#visible = true
	#propsManager = new PropsManager<TProps>()

	// 本地传入
	#timelineLocal?: Timeline
	#projectionLocal?: Projection

	// 从 parent tree 上回溯到的，本地缓存（避免每次都回溯）
	#timelineResolved?: Timeline
	#projectionResolved?: Projection

	/**
	 * if this layer has been added to a polaris instance, this will be set.
	 */
	#polarisResolved?: AbstractPolaris

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

		// initialize views by props.views
		if (props?.views) {
			this.view = {}
			for (const key in props.views) {
				const ViewClass = props.views[key]
				const view = new ViewClass()
				view.init(this)
				this.view[key] = view
			}
		}

		if (props?.parent) {
			props.parent.add(this)
		}

		this.setProps(props || {})

		// init event
		this.addEventListener('rootChange', async (e) => {
			if (this.#inited) {
				const msg = 'InternalError: This layer has already been inited. cannot move a layer'
				console.error(msg)
				this.dispatchEvent({ type: 'error', error: new Error('msg') })
				return
			}

			if (isPolaris(e.root)) {
				const projection = await this.getProjection()
				const timeline = await this.getTimeline()
				const polaris = e.root as AbstractPolaris

				this.init && this.init(projection, timeline, polaris)

				this.dispatchEvent({
					type: 'init',
					projection,
					timeline,
					polaris,
				})

				this.#inited = true

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
			this.dispatchEvent({ type: 'visibilityChange' })
		}
	}

	abstract raycast(
		polaris: AbstractPolaris,
		canvasCoord: CoordV2,
		ndc: CoordV2
	): PickEvent | undefined

	// TODO: Is is necessary to dispose propsManager and event Listeners
	abstract dispose(): void

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
	 */
	watchProps<TKeys extends Array<keyof TProps>>(
		keys: TKeys,
		callback: Callback<TProps, TKeys[number]>,
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
			if (isAbstractLayer(child)) {
				child.traverseVisible(handler)
			}
		})
	}

	// #region resolver

	/**
	 * 获取该Layer的投影模块
	 *
	 * Resolve the Projection instance for this layer.
	 * - if projection is input as initial props, always use that one
	 * - if not, will search parent tree until find the nearest projection instance
	 * - if still not, will wait until current root is added to another tree
	 */
	getProjection(): Promise<Projection> {
		return new Promise((resolve) => {
			// 	请求本地
			if (this.#projectionLocal) {
				resolve(this.#projectionLocal)
				return
			}
			// parent tree 回溯结果的本地缓存
			if (this.#projectionResolved) {
				resolve(this.#projectionResolved)
				return
			}

			// 请求 parent tree
			if (this.parent) {
				if (isPolaris(this.parent)) {
					this.#projectionResolved = this.parent.projection
					resolve(this.parent.projection)
				} else if (isAbstractLayer(this.parent)) {
					// 把任务迭代地交给上级，而非自己去一层层遍历上级
					this.parent.getProjection().then((projection) => {
						this.#projectionResolved = projection
						resolve(projection)
					})
				} else {
					throw new Error(
						'Can not resolve projection from parent because parent is not a Layer or Polaris.'
					)
				}

				return
			}

			// else: 等待获得 parent 之后再请求 parent tree
			this.addEventListener('add', (e) => {
				const parent = e.parent
				if (isPolaris(parent)) {
					this.#projectionResolved = parent.projection
					resolve(parent.projection)
				} else if (isAbstractLayer(parent)) {
					// 把任务迭代地交给上级，而非自己去一层层遍历上级
					parent.getProjection().then((projection) => {
						this.#projectionResolved = projection
						resolve(projection)
					})
				} else {
					throw new Error(
						'Can not resolve projection from parent because parent is not a Layer or Polaris.'
					)
				}
			})
		})
	}

	/**
	 * 获取该Layer的时间线模块
	 *
	 * Resolve the Timeline instance for this layer.
	 * - if timeline is input as initial props, always use that one
	 * - if not, will search parent tree until find the nearest timeline instance
	 * - if still not, will wait until current root is added to another tree
	 */
	getTimeline(): Promise<Timeline> {
		return new Promise((resolve) => {
			// 	请求本地
			if (this.#timelineLocal) {
				resolve(this.#timelineLocal)
				return
			}
			// parent tree 回溯结果的本地缓存
			if (this.#timelineResolved) {
				resolve(this.#timelineResolved)
				return
			}

			// 请求 parent tree
			if (this.parent) {
				if (isPolaris(this.parent)) {
					this.#timelineResolved = this.parent.timeline
					resolve(this.parent.timeline)
				} else if (isAbstractLayer(this.parent)) {
					// 把任务迭代地交给上级，而非自己去一层层遍历上级
					this.parent.getTimeline().then((timeline) => {
						this.#timelineResolved = timeline
						resolve(timeline)
					})
				} else {
					throw new Error(
						'Can not resolve timeline from parent because parent is not a Layer or Polaris.'
					)
				}

				return
			}

			// else: 等待获得 parent 之后再请求 parent tree
			this.addEventListener('add', (e) => {
				const parent = e.parent
				if (isPolaris(parent)) {
					this.#timelineResolved = parent.timeline
					resolve(parent.timeline)
				} else if (isAbstractLayer(parent)) {
					// 把任务迭代地交给上级，而非自己去一层层遍历上级
					parent.getTimeline().then((timeline) => {
						this.#timelineResolved = timeline
						resolve(timeline)
					})
				} else {
					throw new Error(
						'Can not resolve timeline from parent because parent is not a Layer or Polaris.'
					)
				}
			})
		})
	}

	/**
	 * 获取该Layer的Polaris实例
	 *
	 * Resolve the Polaris instance for this layer.
	 * - will search parent tree until find the root Polaris instance
	 * - if still not, will wait until current root is added to another tree
	 */
	getPolaris(): Promise<AbstractPolaris> {
		return new Promise((resolve) => {
			// 	请求本地
			if (this.#polarisResolved) {
				resolve(this.#polarisResolved)
				return
			}

			// @todo @optimize use .root instead of .parent

			// 请求 parent tree
			if (this.parent) {
				if (isPolaris(this.parent)) {
					this.#polarisResolved = this.parent
					resolve(this.parent)
				} else if (isAbstractLayer(this.parent)) {
					// 把任务迭代地交给上级，而非自己去一层层遍历上级
					this.parent.getPolaris().then((polaris) => {
						this.#polarisResolved = polaris
						resolve(polaris)
					})
				} else {
					throw new Error(
						'Can not resolve polaris from parent because parent is not a Layer or Polaris.'
					)
				}

				return
			}

			// else: 等待获得 parent 之后再请求 parent tree
			this.addEventListener('add', (e) => {
				const parent = e.parent
				if (isPolaris(parent)) {
					this.#polarisResolved = parent
					resolve(parent)
				} else if (isAbstractLayer(parent)) {
					// 把任务迭代地交给上级，而非自己去一层层遍历上级
					parent.getPolaris().then((polaris) => {
						this.#polarisResolved = polaris
						resolve(polaris)
					})
				} else {
					throw new Error(
						'Can not resolve polaris from parent because parent is not a Layer or Polaris.'
					)
				}
			})
		})
	}

	// #endregion

	/**
	 * sync interface. legacy only. not recommended.
	 * @deprecated
	 */
	get localProjection(): Projection | undefined {
		return this.#projectionLocal
	}
	/**
	 * sync interface. legacy only. not recommended.
	 * @deprecated
	 */
	get resolvedProjection(): Projection | undefined {
		return this.#projectionResolved
	}

	/**
	 * sync interface. legacy only. not recommended.
	 * @deprecated
	 */
	get localTimeline(): Timeline | undefined {
		return this.#timelineLocal
	}
	/**
	 * sync interface. legacy only. not recommended.
	 * @deprecated
	 */
	get resolvedTimeline(): Timeline | undefined {
		return this.#timelineResolved
	}
	/**
	 * sync interface. legacy only. not recommended.
	 * @deprecated
	 */
	get resolvedPolaris(): AbstractPolaris | undefined {
		return this.#polarisResolved
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
	set onVisibilityChange(f: () => void) {
		this.addEventListener('visibilityChange', () => {
			f()
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
	protected listenProps<TKeys extends Array<keyof TProps>>(
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
	return v.isAbstractLayer && v.isAbstractNode && v.isEventDispatcher
}
export const isLayer = isAbstractLayer

export const Layer = AbstractLayer

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

export interface PickEvent {
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

export interface PickEventResult extends PickEvent {
	pointerCoords: {
		canvas: CoordV2
		ndc: CoordV2
		screen: CoordV2
	}
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
