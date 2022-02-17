/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 *
 * @author Simon
 *
 *
 * @note about performance of class extending
 * 		@link https://mathiasbynens.be/notes/prototypes
 * 		@link https://webkit.org/blog/6756/es6-feature-complete/#:~:text=Property%20Conditions%20and-,Adaptive%20Watchpoints,-Since%20TryGetById%20participates
 * 		If V8 uses validity cell to do inline cache for prototype methods.
 * 		The length of prototype chain shouldn't affect the performance.
 */

import { AbstractNode } from './AbstractNode'
import type { CameraProxy } from 'camera-proxy'
import { PropsManager, ListenerOptions, Callback } from '@polaris.gl/utils-props-manager'
import type { AbstractLayerEvents } from './events'

/**
 * Base class for layers, with reactive props and event model.
 */
export abstract class AbstractLayer<
	TProps extends Record<string, any> = Record<string, any>,
	TExtraEventMap extends AbstractLayerEvents = AbstractLayerEvents
> extends AbstractNode<TExtraEventMap> {
	readonly isBase = true
	readonly isAbstractLayer = true

	#visible = true

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
	 * @deprecated May change in future
	 */
	traverseVisible(handler: (node: AbstractLayer<any /* do not assume generic */>) => void): void {
		if (!this.visible) return

		handler(this)
		this.children.forEach((child) => {
			if (isAbstractLayer(child)) {
				child.traverseVisible(handler)
			}
		})
	}

	show() {
		this.visible = true
	}
	hide() {
		this.visible = false
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
		this.#propsManager.set(props as any)
	}

	/**
	 * destroy all resources
	 */
	abstract dispose(): void

	// #region legacy apis

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
	// #endregion

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
