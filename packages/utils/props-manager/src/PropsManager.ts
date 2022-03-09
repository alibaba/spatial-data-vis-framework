/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { deepDiffProps, pick } from './utils'

/**
 * Props Manager.
 *
 * @compare_logic
 *
 * Props are shallow-copied but deep-compared.
 * That means:
 * - Changing an array or object "in position" will not be detected.
 * - Using deep objects as props is OK. But changing them will cause performance issue.
 *
 * @note this is sync version. do not use async functions as listeners.
 */
export class PropsManager<
	TProps extends Record<string, any>,
	TModifiableKeys extends keyof TProps = keyof TProps
> {
	/**
	 * current props
	 */
	private _props: TProps = {} as TProps // init, safe here
	/**
	 * prop keys and their listeners
	 */
	private _listeners = new Map<keyof TProps, Set<Callback<TProps>>>()

	/**
	 * 获取属性对应的值
	 * @deprecated if you need to use a property, add a listener to it.
	 */
	get<TKey extends keyof TProps>(key: TKey): TProps[TKey] {
		return this._props[key]
	}

	/**
	 * Partially update props. Only input changed or added properties.
	 *
	 * 初始化/更新属性，可以是增量更新
	 *
	 * @note removed properties will be ignored.
	 *
	 * @changed 移除 callback 的 done 参数，和 promise.then 实质上重复
	 * @changed callback 接受的参数中，changedKeys 只会包含自己 listen 的，而不是全部变化的key
	 * @changed callback 调用顺序会变化
	 */
	set(props: Partial<Pick<TProps, TModifiableKeys>>): void {
		// @optimize: only check *passed* and *listened* keys
		const _props = {} as Partial<typeof props>
		const propsKeys = Object.keys(props) as Array<keyof typeof props>
		for (let i = 0; i < propsKeys.length; i++) {
			const key = propsKeys[i]
			if (this._listeners.has(key)) {
				_props[key] = props[key]
			}
		}

		const changedKeys = deepDiffProps(_props, this._props)

		this._props = {
			...this._props,
			...props,
		}

		if (changedKeys.length === 0) return

		// @note key 与 callback 是多对多的，这里需要整理出 那些 key 触发了 哪些 callback

		// callback -> changed keys that this callback is listening
		const callbackKeys = new Map<Callback<TProps>, Array<keyof TProps>>()

		for (let i = 0; i < changedKeys.length; i++) {
			const key = changedKeys[i]
			const listeners = this._listeners.get(key)
			if (!listeners) continue
			listeners.forEach((listener) => {
				let listenedChangedKeys = callbackKeys.get(listener)
				if (listenedChangedKeys === undefined) {
					listenedChangedKeys = [] as Array<keyof TProps>
					callbackKeys.set(listener, listenedChangedKeys)
				}
				listenedChangedKeys.push(key)
			})
		}

		callbackKeys.forEach((listenedChangedKeys, callback) => {
			callback({
				changedKeys: listenedChangedKeys,
				props: pick(this._props, listenedChangedKeys),
				initial: false,
			})
		})

		return
	}

	/**
	 * 注册属性变化监听器
	 *
	 * If any of these keys changed. callback will be called.
	 * Actual changed keys (in this listening list) will be passed to the callback.
	 *
	 * @note set `options` to be true if you want a callback immediately after listen
	 * @note
	 * **async functions as callback is not thread safe!**
	 *
	 * if you intend to do so, either:
	 * 	- use `version` to check if props changed again
	 * 	- or just make sure `.set` won't be called again until last return promise fulfilled
	 */
	addListener<TKeys extends ReadonlyArray<TModifiableKeys>>(
		keys: TKeys,
		callback: Callback<TProps, TKeys[number]>,
		options?: ListenerOptions
	): void {
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i]
			let listeners = this._listeners.get(key)
			if (!listeners) {
				listeners = new Set()
				this._listeners.set(key, listeners)
			}

			listeners.add(callback as any)
		}

		const immediate = options === true ? true : options && options.immediate
		// const once = typeof options === 'boolean' ? false : options && options.once
		if (immediate) {
			callback({
				changedKeys: keys,
				props: pick(this._props, keys),
				initial: true,
			})
		}
	}

	/**
	 * stop listening for certain keys
	 * @note will not cancel fired callbacks
	 */
	removeListeners<TKeys extends Array<TModifiableKeys>>(
		keys: TKeys,
		callback: Callback<TProps, TKeys[number]>
	): void {
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i]
			const listeners = this._listeners.get(key)
			if (!listeners) continue
			listeners.delete(callback as any)
		}
	}

	dispose(): void {
		this._props = {} as TProps
		this._listeners.clear()
	}

	// legacy

	/**
	 * @alias use {@link addListener} instead
	 * @note safe to write like this. @simon
	 */
	listen = this.addListener

	// experimental

	/**
	 * update props directly without trigger dirty-checking
	 * @deprecated @experimental may change in future
	 * @deprecated it's the same to save an editable copy outside of the propsManager
	 *
	 * @note use this only if you handled props change manually.
	 * @note only affect one calling.
	 *
	 * @problems
	 * 如果未来增加 “延迟回调” 或者 “合并藏检查”，该设计能否兼容
	 *
	 * @case_0
	 *
	 * { // batch dirty check
	 * 	a.setProps({k: 0})
	 * }
	 *
	 * { // batch dirty check
	 * 	a.setProps({k: 2})
	 * 	a.setProps({k: 3}, true)
	 * 	a.setProps({k: 0})
	 * }
	 *
	 * * won't trigger, but ok
	 *
	 * @case_1
	 *
	 * { // batch dirty check
	 * 	a.setProps({k: 0})
	 * }
	 *
	 * { // batch dirty check
	 * 	a.setProps({k: 2})
	 * 	a.setProps({k: 3})
	 * 	a.setProps({k: 4}, true)
	 * }
	 *
	 * * won't trigger, can be problematic
	 *
	 * @case_2
	 *
	 * { // batch dirty check
	 * 	a.setProps({k: 0})
	 * 	a.setProps({k: 1}, true)
	 * }
	 *
	 * { // batch dirty check
	 * 	a.setProps({k: 0})
	 * }
	 *
	 * * trigger
	 *
	 * @case_3
	 *
	 * { // batch dirty check
	 * 	a.setProps({k: 0})
	 * }
	 *
	 * { // batch dirty check
	 * 	a.setProps({k: 1}, true)
	 * 	a.setProps({k: 0})
	 * }
	 *
	 * * won't trigger, difference between case_2 is definitely problematic
	 *
	 * @potential_solve
	 * Make `direct .setProps` and `.getProps` work like `async fence`,
	 * always `finalize` dirty-check when calling?
	 */
	bypass(props: Partial<Pick<TProps, TModifiableKeys>>): void {
		this._props = {
			...this._props,
			...props,
		}
	}
}

/**
 * whether trigger this initial event immediately after listen.
 *
 * or detailed options
 */
export type ListenerOptions =
	| boolean
	| {
			/**
			 * whether trigger this initial event immediately after listen.
			 */
			immediate?: boolean
			/**
			 * whether this callback should only be called once
			 */
			// once?: boolean
	  }

/**
 * listener callback type
 */
export type Callback<TProps, TKey extends keyof TProps = keyof TProps> = (event: {
	/**
	 * actually changed keys.
	 */
	changedKeys: readonly TKey[]
	/**
	 * an object including actually changed props.
	 * @note a property may be undefined if this is the initial event
	 */
	props: Pick<TProps, TKey>
	/**
	 * Indicate that this is the initial event triggered immediately after listen.
	 */
	initial: boolean
}) => void

/**
 * hosted instances
 *
 * for situations where it's not allowed to use `.propsManager` as a class member
 *
 * also an excellent way to hide private stuff
 */

const managerInstances = new Map<any, PropsManager<any>>()
export function getPropsManager<TProps, TKey extends keyof TProps = keyof TProps>(obj: object) {
	let manager = managerInstances.get(obj)
	if (!manager) {
		manager = new PropsManager()
		managerInstances.set(obj, manager)
	}

	return manager as PropsManager<TProps, TKey>
}
export function disposePropsManager(obj: object) {
	const manager = managerInstances.get(obj)
	if (manager) {
		manager.dispose()
	}
}

// test
// const a = new PropsManager<{ cc: 'dd' | 'ee'; ff: 'gg' | 'kk' }>()
// a.listen(['cc'], async (event) => {})
// a.listen(['cc', 'ff'], async (event) => {
// 	event.trigger
// })
// a.listen(['cc', 'hh'], async (event) => {})

// private as interface

// class A {
// 	#s: number
// 	pub: string
// }

// class B extends A {
// 	#s: boolean
// 	pub: string
// }

// function hh(v: A) {}

// const b = new B()

// hh(b)
