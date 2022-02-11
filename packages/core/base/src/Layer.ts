/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */
/* eslint-disable @typescript-eslint/ban-types */

import { AbstractLayer } from './AbstractLayer'
import { Projection } from '@polaris.gl/projection'
import { Timeline } from 'ani-timeline'

import { AbstractPolaris } from './Polaris'
import { View } from './View'
import type { CameraProxy } from 'camera-proxy'

export interface LayerProps {
	name?: string
	parent?: Layer
	timeline?: Timeline
	projection?: Projection
	views?: { [key: string]: new () => View }
}

export interface LayerEventTypes<TThis> {
	// add: { parent: TThis }
	// remove: { parent: TThis }
	// rootChange: { root: TThis }
	visibilityChange: {}
	viewChange: {
		cameraProxy: CameraProxy
		polaris: AbstractPolaris /* typeof Polaris */
	}
	beforeRender: { polaris: AbstractPolaris /* typeof Polaris */ }
	afterRender: { polaris: AbstractPolaris /* typeof Polaris */ }
	pick: { result?: PickEventResult }
	hover: { result?: PickEventResult }
	init: { projection: Projection; timeline: Timeline; polaris: AbstractPolaris }
	afterInit: { projection: Projection; timeline: Timeline; polaris: AbstractPolaris }
}

/**
 * empty layer
 */
export class Layer extends AbstractLayer<LayerProps> {
	declare EventTypes: AbstractLayer['EventTypes'] & LayerEventTypes<this>

	/**
	 * readable name of this layer
	 */
	name: string

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
	view: { [key: string]: View }

	/**
	 * if this layer has been added to a polaris instance, this will be set.
	 */
	polaris: AbstractPolaris | null

	/**
	 * Initialization entry
	 *
	 * you can use this.timeline, this.projection and polaris safely
	 *
	 * exactly same effect as this.addEventListener('init')
	 *
	 * @alias this.addEventListener('init')
	 */
	protected init?(projection: Projection, timeline: Timeline, polaris: AbstractPolaris): void

	/**
	 * @constructor
	 * @param props
	 */
	constructor(props: LayerProps = {}) {
		super()

		this.name = props.name || 'abstract-layer'

		// 本地投影和时间线
		this._projectionLocal = props.projection
		this._timelineLocal = props.timeline

		// initialize views by props.views
		if (props.views) {
			this.view = {}
			for (const key in props.views) {
				const ViewClass = props.views[key]
				const view = new ViewClass()
				view.init(this)
				this.view[key] = view
			}
		}

		if (props.parent) {
			props.parent.add(this)
		}

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

	/**
	 * 获取该Layer的投影模块
	 */
	getProjection(): Promise<Projection> {
		return new Promise((resolve) => {
			// 	请求本地
			if (this._projectionLocal) {
				resolve(this._projectionLocal)
				return
			}
			// parent tree 回溯结果的本地缓存
			if (this._projectionResolved) {
				resolve(this._projectionResolved)
				return
			}
			// 请求 parent tree
			if (this.parent) {
				// 把任务迭代地交给上级，而非自己去一层层遍历上级
				this.parent.getProjection().then((projection) => {
					this._projectionResolved = projection
					resolve(projection)
				})
				return
			}
			// 等待获得 parent 之后再请求 parent tree
			this.onAdd = (parent: Layer) => {
				parent.getProjection().then((projection) => {
					this._projectionResolved = projection
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
			if (this._timelineLocal) {
				resolve(this._timelineLocal)
				return
			}
			// parent tree 回溯结果的本地缓存
			if (this._timelineResolved) {
				resolve(this._timelineResolved)
				return
			}
			// 请求 parent tree
			if (this.parent) {
				// 把任务迭代地交给上级，而非自己去一层层遍历上级
				this.parent.getTimeline().then((timeline) => {
					this._timelineResolved = timeline
					resolve(timeline)
				})
				return
			}
			// 等待获得 parent 之后再请求 parent tree
			this.onAdd = (parent: Layer) => {
				parent.getTimeline().then((timeline) => {
					this._timelineResolved = timeline
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
			if (this.polaris) {
				resolve(this.polaris)
				return
			}
			// 请求 parent tree
			if (this.parent) {
				// 把任务迭代地交给上级，而非自己去一层层遍历上级
				this.parent.getPolaris().then((polaris) => {
					this.polaris = polaris
					resolve(polaris)
				})
				return
			}
			// 等待获得 parent 之后再请求 parent tree
			this.onAdd = (parent: Layer) => {
				parent.getPolaris().then((polaris) => {
					this.polaris = polaris
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
	// updateProps(props: never): void {}

	dispose() {}

	// #region legacy apis

	// 本地传入
	/**
	 * @deprecated
	 */
	private _timelineLocal?: Timeline
	/**
	 * @deprecated
	 */
	private _projectionLocal?: Projection

	// 从 parent tree 上回溯到的，本地缓存（避免每次都回溯）
	/**
	 * @deprecated
	 */
	private _timelineResolved?: Timeline
	/**
	 * @deprecated
	 */
	private _projectionResolved?: Projection

	// get projection(): Promise<Projection> {
	// 	return this.getProjection()
	// }
	// get timeline(): Promise<Timeline> {
	// 	return this.getTimeline()
	// }

	/**
	 * sync interface. legacy only. not recommended.
	 * @deprecated
	 */
	get localProjection(): Projection | undefined {
		return this._projectionLocal
	}
	/**
	 * sync interface. legacy only. not recommended.
	 * @deprecated
	 */
	get resolvedProjection(): Projection | undefined {
		return this._projectionResolved
	}

	/**
	 * sync interface. legacy only. not recommended.
	 * @deprecated
	 */
	get localTimeline(): Timeline | undefined {
		return this._timelineLocal
	}
	/**
	 * sync interface. legacy only. not recommended.
	 * @deprecated
	 */
	get resolvedTimeline(): Timeline | undefined {
		return this._timelineResolved
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
	 * @deprecated use {@link https://www.typescriptlang.org/docs/handbook/2/classes.html#this-based-type-guards}
	 */
	readonly isLayer = true

	// #endregion
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
