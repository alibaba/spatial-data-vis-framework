/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 *
 * @author Simon
 *
 * @note about performance of class extending
 * 		@link https://mathiasbynens.be/notes/prototypes
 * 		@link https://webkit.org/blog/6756/es6-feature-complete/#:~:text=Property%20Conditions%20and-,Adaptive%20Watchpoints,-Since%20TryGetById%20participates
 * 		If V8 uses validity cell to do inline cache for prototype methods.
 * 		The length of prototype chain shouldn't affect the performance.
 */
/* eslint-disable @typescript-eslint/ban-types */

import type { CameraProxy } from 'camera-proxy'
import { AbstractNode } from './AbstractNode'

/**
 * Base class for layers
 */
export abstract class AbstractLayer<
	/**
	 * event names and event object types.
	 * 声明所有可能的事件和回调接口，来在事件接口中获得正确的类型检查。
	 */
	TEventTypes extends {
		add: { parent: AbstractLayer<TEventTypes> }
		remove: { parent: AbstractLayer<TEventTypes> }
		rootChange: { root: AbstractLayer<TEventTypes> }
		visibilityChange: {}
		viewChange: {
			cameraProxy: CameraProxy
			polaris: any /* typeof Polaris */
		}
		beforeRender: { polaris: any /* typeof Polaris */ }
		afterRender: { polaris: any /* typeof Polaris */ }
		pick: { result?: PickEventResult }
		hover: { result?: PickEventResult }
	}
> extends AbstractNode<TEventTypes> {
	readonly isBase = true
	readonly isAbstractLayer = true

	private _visible = true
	private _level: C_LEVEL

	/**
	 * readable name of this layer
	 */
	name: string

	/**
	 * visibility of this layer
	 */
	get visible() {
		return this._visible
	}

	set visible(v: boolean) {
		if (this._visible !== v) {
			this._visible = v
			this.dispatchEvent({ type: 'visibilityChange' })
		}
	}

	/**
	 * 相机状态，用于对比视角是否发生变化
	 */
	statesCode = ''

	constructor(props: {
		name?: string
		/**
		 * @deprecated
		 */
		// level?: C_LEVEL
	}) {
		super()

		this.name = props.name || 'abstract-layer'
		// this._level = props.level ?? C_LEVEL.L0
	}

	show() {
		this.visible = true
	}
	hide() {
		this.visible = false
	}

	traverseVisible(handler: (node: AbstractLayer<TEventTypes>) => void): void {
		if (!this.visible) return

		handler(this)
		this.children.forEach((child) => {
			;(child as AbstractLayer<TEventTypes>).traverseVisible(handler)
		})
	}

	/**
	 * @note @todo @changed @yy
	 * 老版本中使用事件？似乎不太合理？
	 */
	abstract raycast(
		polaris: AbstractNode<TEventTypes>,
		canvasCoord: CoordV2,
		ndc: CoordV2
	): PickEvent | undefined

	/**
	 * destroy all resources
	 */
	abstract dispose(): void

	/**
	 * legacy api-s
	 */

	/**
	 * content level. used to determine renderer compatibility
	 * @deprecated
	 */
	get level() {
		return this._level
	}

	/**
	 * @deprecated use {@link .addEventListener} instead
	 * callback when object/layer is added to a parent
	 */
	set onAdd(f: (parent) => void) {
		this.addEventListener('add', (event) => {
			f(event.parent)
		})
	}

	/**
	 * @deprecated use {@link .addEventListener} instead
	 * callback when object/layer is removed from parent
	 */
	set onRemove(f: (parent) => void) {
		this.addEventListener('remove', (event) => {
			f(event.parent)
		})
	}

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
	 * callback when object/layer
	 */
	set onVisibilityChange(f: () => void) {
		this.addEventListener('visibilityChange', () => {
			f()
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
}

// test code
// const a = new AbstractLayer()
// a.addEventListener('add', (event) => {
// 	event.target
// })
// a.addEventListener('visibilityChange', (event) => {})
// a.addEventListener('ccc', (event) => {})
// a.addEventListener('')

/**
 * @deprecated renamed as {@link AbstractLayer} for clarity
 */
export const Base = AbstractLayer

// helper types

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

/**
 * @deprecated
 * @todo not practical, remove this
 * 内容分级，
 * 数值越高复杂度越高，可以使用特定的底层依赖的渲染资源，
 * 数值越低兼容性越好，可以不同程度支持 IE 或者 移动端
 */
export enum C_LEVEL {
	L0, // html / svg 内容
	L1, // canvas 内容
	L2, // 基础 webgl1 threejs 内容
	L3, // 基础 webgl2 内容
	L4, // 复杂 webgl2 内容
	L5, // HDpPipeline 内容
	L6, // 特定硬件/webgpu/实验性特性 内容
}
