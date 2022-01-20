/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */
/* eslint-disable @typescript-eslint/ban-types */

import { AbstractLayer, CoordV2, PickEvent, PickEventResult } from './AbstractLayer'
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

interface EventTypes {
	add: { parent: Layer }
	remove: { parent: Layer }
	rootChange: { root: Layer }
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

// override some inherited properties and methods interface
export interface Layer {
	get parent(): Layer
	get children(): Set<Layer>
	get root(): Layer
	add(child: Layer): void
	remove(child: Layer): void
	traverse(handler: (node: Layer) => void): void
}

/**
 * empty layer
 */
export class Layer extends AbstractLayer<EventTypes> {
	readonly isLayer = true

	/**
	 * view, the actual rendered contents
	 * can have multi views in one layer, e.g. gsiView + htmlView
	 */
	view: { [key: string]: View }

	polaris: AbstractPolaris | null

	// 本地传入
	private _timelineLocal?: Timeline
	private _projectionLocal?: Projection

	// 从 parent tree 上回溯到的，本地缓存（避免每次都回溯）
	private _timelineResolved?: Timeline
	private _projectionResolved?: Projection

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
		super(props)

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

	// get projection(): Promise<Projection> {
	// 	return this.getProjection()
	// }
	// get timeline(): Promise<Timeline> {
	// 	return this.getTimeline()
	// }

	/**
	 * sync interface. legacy only. not recommended.
	 */
	get localProjection(): Projection | undefined {
		return this._projectionLocal
	}

	get resolvedProjection(): Projection | undefined {
		return this._projectionResolved
	}

	/**
	 * sync interface. legacy only. not recommended.
	 */
	get localTimeline(): Timeline | undefined {
		return this._timelineLocal
	}

	get resolvedTimeline(): Timeline | undefined {
		return this._timelineResolved
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
		console.warn('Layer::raycast not implemented. implement this method in subclass if pick-ale.')
		return
	}

	dispose() {}
}

// test code
// const a = new Layer()
// a.parent
