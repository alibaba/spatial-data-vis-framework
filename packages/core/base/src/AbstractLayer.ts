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

import { AbstractNode } from './AbstractNode'
import type { CameraProxy } from 'camera-proxy'
import type { AbstractPolaris } from './Polaris'
import { PropsManager, ListenerOptions, Callback } from '@polaris.gl/utils-props-manager'

export type AbstractLayerEvents = {
	visibilityChange: {}
	viewChange: {
		cameraProxy: CameraProxy
		polaris: AbstractPolaris /* typeof Polaris */
	}
	beforeRender: { polaris: AbstractPolaris /* typeof Polaris */ }
	afterRender: { polaris: AbstractPolaris /* typeof Polaris */ }
}

/**
 * Base class for layers
 *
 * @note
 * TEvents is a generic type. Containing event names and event object types.
 *
 * @noteCN
 * 在 TEvents 中声明所有可能的事件和回调接口，来在事件接口中获得正确的类型检查。
 */
export abstract class AbstractLayer<
	TEventTypes extends Record<string, Record<string, any>> = any,
	TProps extends Record<string, any> = any
> extends AbstractNode<TEventTypes & AbstractLayerEvents> {
	readonly isBase = true
	readonly isAbstractLayer = true

	private _visible = true

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
	 *
	 * camera states
	 */
	statesCode = ''

	show() {
		this.visible = true
	}
	hide() {
		this.visible = false
	}

	/**
	 * @deprecated May change in future
	 */
	traverseVisible(handler: (node: AbstractLayer /* this */) => void): void {
		if (!this.visible) return

		handler(this)
		this.children.forEach((child) => {
			if (isAbstractLayer(child)) {
				child.traverseVisible(handler)
			}
		})
	}

	// #region props manager

	/**
	 * powering the `watchProps` method of this class.
	 */
	#propsManager = new PropsManager<TProps>()

	protected getProp<TKey extends keyof TProps>(key: TKey): TProps[TKey] {
		return this.#propsManager.get(key)
	}

	protected watchProps<TKeys extends Array<keyof TProps>>(
		keys: TKeys,
		callback: Callback<TProps, TKeys[number]>,
		options?: ListenerOptions
	): void {
		this.#propsManager.addListener(keys, callback, options)
	}

	setProps(props: Partial<TProps>) {
		this.#propsManager.set(props)
	}

	/**
	 * destroy all resources
	 */
	abstract dispose(): void

	/**
	 * callback when object/layer is added to a parent
	 * @note different from addEventListener('add'), this will be triggered if the layer is already added to a parent
	 */
	set onAdd(f: (parent: AbstractNode) => void) {
		if (this.parent) {
			f(this.parent)
		} else {
			this.addEventListener(
				'add',
				(event) => {
					f(event.parent)
				},
				{ once: true }
			)
		}
	}

	// #region legacy apis

	/**
	 * update props
	 * @todo whether rename to setProps?
	 * @deprecated
	 */
	updateProps = this.setProps

	/**
	 * @deprecated
	 */
	listenProps = this.watchProps
	// #endregion

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

	// #endregion
}

export function isAbstractLayer(v: any): v is AbstractLayer {
	return v.isAbstractLayer && v.isAbstractNode && v.isEventDispatcher
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

/**
 * @deprecated
 * @todo not practical, remove this
 * 内容分级，
 * 数值越高复杂度越高，可以使用特定的底层依赖的渲染资源，
 * 数值越低兼容性越好，可以不同程度支持 IE 或者 移动端
 * 
 export enum C_LEVEL {
	 L0, // html / svg 内容
	 L1, // canvas 内容
	 L2, // 基础 webgl1 threejs 内容
	 L3, // 基础 webgl2 内容
	 L4, // 复杂 webgl2 内容
	 L5, // HDpPipeline 内容
	 L6, // 特定硬件/webgpu/实验性特性 内容
	}
	
*/
