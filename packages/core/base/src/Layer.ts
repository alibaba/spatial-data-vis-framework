/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { AbstractLayer } from './AbstractLayer'
import { Projection } from '@polaris.gl/projection'
import { Timeline } from 'ani-timeline'

import { AbstractPolaris } from './Polaris'
import { View } from './View'

export interface LayerProps {
	name?: string
	parent?: Layer
	timeline?: Timeline
	projection?: Projection
	views?: { [key: string]: new () => View }
}

export type LayerEvents = {
	pick: { result?: PickEventResult }
	hover: { result?: PickEventResult }
	init: { projection: Projection; timeline: Timeline; polaris: AbstractPolaris }
	afterInit: { projection: Projection; timeline: Timeline; polaris: AbstractPolaris }
}

/**
 * empty layer
 */
export class Layer<
	TEventTypes extends Record<string, Record<string, any>> = any,
	TProps extends LayerProps = LayerProps
> extends AbstractLayer<TEventTypes & LayerEvents, TProps> {
	readonly isLayer = true

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

	/**
	 * @constructor
	 * @param props
	 */
	constructor(props?: TProps) {
		super()

		// const  p = this.getProp('parent')
		this.setProps({
			parent: this,
		})

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

		Promise.all([this.getProjection(), this.getTimeline(), this.getPolaris()]).then(
			([projection, timeline, polaris]) => {
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
		)
	}

	setProps(props: Partial<TProps | LayerProps>) {
		/**
		 * @note keep in mind that:
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
		 * 			this.t2 = { s: true } // ❌ TS Error
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
		 * class B extends A<{ l: boolean; s: boolean }> {
		 * 		set() {
		 * 			this.t1 = { s: true } // ❌ TS Error
		 * 			this.t2 = { s: true } // ✅ TS Pass
		 * 			this.t3 = { s: true } // ✅ TS Pass
		 * 			this.t3 = { l: true } // ✅ TS Pass
		 * 		}
		 * }
		 * ```
		 */
		super.setProps(props as any)
	}

	/**
	 * 获取该Layer的投影模块
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
				if (!isLayer(this.parent))
					throw new Error('Can not resolve projection from parent because parent is not a Layer.')

				// 把任务迭代地交给上级，而非自己去一层层遍历上级
				this.parent.getProjection().then((projection) => {
					this.#projectionResolved = projection
					resolve(projection)
				})
				return
			}
			// 等待获得 parent 之后再请求 parent tree
			this.onAdd = (parent) => {
				if (!isLayer(parent))
					throw new Error('Can not resolve projection from parent because parent is not a Layer.')

				parent.getProjection().then((projection) => {
					this.#projectionResolved = projection
					resolve(projection)
				})
			}
		})
	}

	/**
	 * 获取该Layer的时间线模块
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
				if (!isLayer(this.parent))
					throw new Error('Can not resolve timeline from parent because parent is not a Layer.')

				// 把任务迭代地交给上级，而非自己去一层层遍历上级
				this.parent.getTimeline().then((timeline) => {
					this.#timelineResolved = timeline
					resolve(timeline)
				})
				return
			}
			// 等待获得 parent 之后再请求 parent tree
			this.onAdd = (parent) => {
				if (!isLayer(parent))
					throw new Error('Can not resolve timeline from parent because parent is not a Layer.')

				parent.getTimeline().then((timeline) => {
					this.#timelineResolved = timeline
					resolve(timeline)
				})
			}
		})
	}

	/**
	 * 获取该Layer的Polaris实例
	 */
	getPolaris(): Promise<AbstractPolaris> {
		return new Promise((resolve) => {
			// 	请求本地
			if (this.#polarisResolved) {
				resolve(this.#polarisResolved)
				return
			}
			// 请求 parent tree
			if (this.parent) {
				if (!isLayer(this.parent))
					throw new Error('Can not resolve polaris from parent because parent is not a Layer.')

				// 把任务迭代地交给上级，而非自己去一层层遍历上级
				this.parent.getPolaris().then((polaris) => {
					this.#polarisResolved = polaris
					resolve(polaris)
				})
				return
			}
			// 等待获得 parent 之后再请求 parent tree
			this.onAdd = (parent) => {
				if (!isLayer(parent))
					throw new Error('Can not resolve polaris from parent because parent is not a Layer.')

				parent.getPolaris().then((polaris) => {
					this.#polarisResolved = polaris
					resolve(polaris)
				})
			}
		})
	}

	raycast(polaris: AbstractPolaris, canvasCoord: CoordV2, ndc: CoordV2): PickEvent | undefined {
		warnUnimplementedRaycast()
		return
	}

	/**
	 * update props
	 */

	dispose() {}

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

	// #region legacy apis

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

	// #endregion
}

export interface Layer {
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
}

export function isLayer(v: any): v is Layer {
	return v.isLayer && v.isAbstractLayer && v.isAbstractNode && v.isEventDispatcher
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

// helpers
let warnUnimplementedRaycastCount = 0
function warnUnimplementedRaycast() {
	if (warnUnimplementedRaycastCount < 10) {
		console.warn('Layer::raycast not implemented. implement this method in subclass if pick-ale.')
	}
	if (warnUnimplementedRaycastCount === 10) {
		console.warn('Layer::warnUnimplementedRaycast too many warnings. no more will be reported.')
	}
	warnUnimplementedRaycastCount++
}

// test code
// const a = new Layer()
// a.parent
