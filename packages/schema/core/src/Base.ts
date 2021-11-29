/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
// 只引入type，做类型检查，并不依赖
import { CameraProxy } from 'camera-proxy'

/**
 * Layer 生命周期
 * - onAdd
 * - onBeforeRender
 * - onAfterRender
 * - onVisibilityChange
 * - onViewChange
 * - onRemove
 */

/**
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
	L5, // hdpipeline 内容
	L6, // 特定硬件/webgpu/实验性特性 内容
}

export type EVENT_NAME =
	| 'add'
	| 'remove'
	| 'visibilityChange'
	| 'viewChange'
	| 'beforeRender'
	| 'afterRender'
	| 'click'
	| 'hover'
	| 'picked'
	| 'hovered'

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

export interface OutputPickEvent extends PickEvent {
	pointerCoords: {
		canvas: CoordV2
		ndc: CoordV2
		screen: CoordV2
	}
}

/**
 * Base is ancestors for all renderable object in Polaris
 * Base 是场景数中的每个节点的基类。
 * 只实现节点生命周期管理，不负责视觉元素相关和地理、动画相关的逻辑。
 */
export abstract class Base {
	readonly isBase = true

	name: string
	parent?: Base
	children = new Set<Base>()
	level: C_LEVEL

	private _visible = true
	private _removed = false

	protected _onAdd: { (parent: Base): void }[] = []
	protected _onRemove: { (parent: Base): void }[] = [() => (this._removed = true)]
	protected _onVisibilityChange: { (parent?: Base): void }[] = []
	_onViewChange: { (cam: CameraProxy, polaris: Base): void }[] = []
	_onBeforeRender: { (polaris: Base, cam: CameraProxy): void }[] = []
	_onAfterRender: { (polaris: Base, cam: CameraProxy): void }[] = []

	/**
	 * common pointer events
	 */
	// Polaris触发click事件后派发给children，由children实现picking计算结果后返回给Polaris
	protected _onClick: (polaris: Base, canvasCoords: CoordV2, ndc: CoordV2) => PickEvent | undefined

	// Polaris触发hover事件后派发给children，由children实现hovering计算结果后返回给Polaris
	protected _onHover: (polaris: Base, canvasCoords: CoordV2, ndc: CoordV2) => PickEvent | undefined

	// 外部监听picked/hovered事件入口
	_onPicked: { (event: OutputPickEvent | undefined): void }[] = []
	_onHovered: { (event: OutputPickEvent | undefined): void }[] = []

	/**
	 * Creates an instance of Base.
	 * @param {*} [props={}]
	 * @memberof Base
	 */
	constructor(props: any = {}) {
		this.name = props.name || 'base'
		this.level = props.level || C_LEVEL.L0
	}

	set visible(v: boolean) {
		this._visible = v
		this._onVisibilityChange.forEach((f) => f(this.parent))
	}

	get visible(): boolean {
		return this._visible
	}

	/**
	 * 相机状态，用于对比视角是否发生变化
	 */
	statesCode = ''
	// @note 在这里触发回调的话，将无法获取 polaris 和 camera 实例，
	// 因此交给Polaris触发
	// set statesCode(v: string) {
	// 	if (this._statesCode !== v) {
	// 		this._statesCode = v
	// 		this._onViewChange.forEach((f) => f())
	// 	}
	// }

	/**
	 * callback when object/layer is added to a parent
	 */
	set onAdd(f: (parent) => void) {
		if (this.parent) {
			// 已经被add过，立即执行回调
			// console.warn('onAdd::该Layer已经被add过，立即执行回调')
			f(this.parent)
		}

		this._onAdd.push(f)
	}

	/**
	 * callback when object/layer is removed from parent
	 */
	set onRemove(f: (parent) => void) {
		this._onRemove.push(f)
	}

	/**
	 * callback when camera state is changed
	 */
	set onViewChange(f: (cam: CameraProxy, polaris: Base) => void) {
		this._onViewChange.push(f)
	}

	/**
	 * callback before object/layer to be rendered in every frame
	 */
	set onBeforeRender(f: (polaris: Base) => void) {
		this._onBeforeRender.push(f)
	}

	/**
	 * callback after object/layer rendered in every frame
	 */
	set onAfterRender(f: (polaris: Base) => void) {
		this._onAfterRender.push(f)
	}

	/**
	 * callback when object/layer
	 */
	set onVisibilityChange(f: (parent?: Base) => void) {
		this._onVisibilityChange.push(f)
	}

	/**
	 * callback when this layer is being clicked/tapped by user pointer
	 * descendants should implement their own logic and return the click result.
	 */
	protected set onClick(
		f: (polaris: Base, canvasCoord: CoordV2, ndc: CoordV2) => PickEvent | undefined
	) {
		this._onClick = f
	}

	/**
	 * callback when this layer is being hovered by user pointer
	 * descendants should implement their own logic and return the hover result.
	 */
	protected set onHover(
		f: (polaris: Base, canvasCoord: CoordV2, ndc: CoordV2) => PickEvent | undefined
	) {
		this._onHover = f
	}

	/**
	 * callbacks when any object/layer has been picked by user pointer
	 */
	set onPicked(f: (event: OutputPickEvent | undefined) => void) {
		this._onPicked.push(f)
	}

	/**
	 * callbacks when any object/layer has been hovered on by user pointer
	 */
	set onHovered(f: (event: OutputPickEvent | undefined) => void) {
		this._onHovered.push(f)
	}

	/**
	 *
	 * @param {string} name
	 * @param {Function} listener
	 * @return {*}  {boolean} True if the listener has been registed successfully, otherwise false.
	 * @memberof Base
	 */
	addEventListener(name: EVENT_NAME, listener: any): boolean {
		if (!listener) return false
		const eventName = 'on' + name[0].toUpperCase() + name.substring(1)
		const arr = this['_' + eventName] as any[]
		if (!arr) {
			console.error(`Invalid event name: '${name}'`)
			return false
		}
		this[eventName] = listener
		return true
	}

	/**
	 *
	 * @param {string} name
	 * @param {Function} listener
	 * @return {*} {boolean} True if the listener has been removed successfully, otherwise false.
	 * @memberof Base
	 */
	removeEventListener(name: EVENT_NAME, listener: any): boolean {
		if (!listener) return false
		const eventName = '_on' + name[0].toUpperCase() + name.substring(1)
		const arr = this[eventName] as any[]
		if (!arr) {
			console.error(`Invalid event name: '${name}'`)
			return false
		}
		const index = arr.indexOf(listener)
		if (index < 0) return false
		arr.splice(index, 1)
		return true
	}

	/**
	 *
	 * @param {EVENT_NAME} name
	 * @param {*} args
	 * @return {*}
	 * @memberof Base
	 */
	triggerEvent(name: EVENT_NAME, ...args) {
		const eventName = '_on' + name[0].toUpperCase() + name.substring(1)
		const arr = this[eventName] as any[]
		if (!arr) {
			console.error(`Invalid event name: '${name}'`)
			return false
		}
		arr.forEach((fn) => {
			fn.apply(this, args)
		})
		return true
	}

	/**
	 *
	 * @param {Base} child
	 * @param {Boolean} skipElement 是否不添加HTML元素
	 */
	add(child: Base) {
		if (this.children.has(child)) {
			console.warn('重复添加子元素，忽略')
			return
		}
		if (child._removed) {
			console.warn('子元素已经被remove过，暂不支持重复使用')
			return
		}

		this.children.add(child)

		if (child.parent) {
			console.warn('you try to add this object to multiple parents!')
			child.parent.remove(child)
		}
		child.parent = this

		child._onAdd.forEach((f) => f(this))
	}

	remove(child: Base) {
		// if (!this.children.has(child)) return 1

		this.children.delete(child)

		child._onRemove.forEach((f) => f(this))
	}

	removeAll() {
		for (const child of this.children) {
			this.remove(child)
		}
	}

	show() {
		this.visible = true
	}

	hide() {
		this.visible = false
	}

	traverse(f: (obj: Base) => void) {
		f(this)
		this.children.forEach((child) => child.traverse(f))
	}

	traverseVisible(f: (obj: Base) => void) {
		if (!this.visible) return

		f(this)
		this.children.forEach((child) => child.traverseVisible(f))
	}

	// @TODO
	// traverseParent(f: (obj: Base) => void) {
	// 	f(this)
	// }

	abstract dispose(): void
}
