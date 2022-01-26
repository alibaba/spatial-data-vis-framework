/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { deepDiffProps } from './utils'

/**
 * Props Manager.
 *
 * @note this is sync version. do not use async functions as listeners.
 */
export class PropsManager<TProps extends Record<string, any>> {
	/**
	 * type of callback function
	 */
	private _callbackTemplate: (event: {
		changedKeys: Array<keyof TProps>
		/**
		 * @deprecated rename as changedKeys
		 */
		trigger: Array<keyof TProps>
	}) => void

	/**
	 * current props
	 */
	private _props: TProps = {} as TProps // init, safe here
	/**
	 * prop keys and their listeners
	 */
	private _listeners = new Map<keyof TProps, Set<typeof this._callbackTemplate>>()

	/**
	 * Partially update props. Only pass changed or added properties.
	 *
	 * 初始化/更新属性，可以是增量更新
	 *
	 * @note removed properties will be ignored.
	 *
	 * @changed 移除 callback 的 done 参数，和 promise.then 实质上重复
	 * @changed callback 接受的参数中，changedKeys 只会包含自己 listen 的，而不是全部变化的key
	 * @changed callback 调用顺序会变化
	 */
	set(props: Partial<TProps>): void {
		this._props = {
			...this._props,
			...props,
		}

		// @optimize: ignore un-listened props
		const _props = {} as Partial<typeof props>
		const propsKeys = Object.keys(props) as Array<keyof typeof props>
		for (let i = 0; i < propsKeys.length; i++) {
			const key = propsKeys[i]
			if (this._listeners.has(key)) {
				_props[key] = props[key]
			}
		}

		const changedKeys = deepDiffProps(_props, this._props)

		if (changedKeys.length === 0) return

		// @note key 与 callback 是多对多的，这里需要整理出 那些 key 触发了 哪些 callback

		// callback -> changed keys that this callback is listening
		const callbackKeys = new Map<typeof this._callbackTemplate, Array<keyof TProps>>()

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
				trigger: listenedChangedKeys,
			})
		})

		return
	}

	/**
	 * 获取属性对应的值
	 */
	get<TKey extends keyof TProps>(key: TKey): TProps[TKey] | undefined {
		return this._props[key]
	}

	/**
	 * 注册属性变化监听器
	 *
	 * If any of these keys changed. callback will be called.
	 * Actual changed keys (in this listening list) will be passed to the callback.
	 *
	 * @note **using async functions as callback is not thread safe!**
	 *
	 * if you intend to do so, either:
	 * 	- use `version` to check if props changed again
	 * 	- or just make sure `.set` won't be called again until last return promise fulfilled
	 *
	 * @note initial callback will be fired immediately. set `immediately` false to disable
	 */
	listen<TKeys extends Array<keyof TProps>>(
		keys: TKeys,
		callback: (event: {
			changedKeys: TKeys
			/**
			 * @deprecated renamed as changedKeys
			 */
			trigger: TKeys
		}) => void
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
	}

	/**
	 * stop listening for certain keys
	 * @note will not cancel fired callbacks
	 */
	stopListen<TKeys extends Array<keyof TProps>>(keys: TKeys, callback: (event) => any): void {
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
}

// test
// const a = new PropsManager<{ cc: 'dd' | 'ee'; ff: 'gg' | 'kk' }>()
// a.listen(['cc'], async (event) => {})
// a.listen(['cc', 'ff'], async (event) => {
// 	event.trigger
// })
// a.listen(['cc', 'hh'], async (event) => {})
