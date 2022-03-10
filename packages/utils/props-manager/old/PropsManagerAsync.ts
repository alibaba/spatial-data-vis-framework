/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

// ** this is not stable
// todo 异步回调是潜在bug，如果 调用 set，然后立即又调用，async listener 中 多次 get 的结果会不一致

import { deepDiffProps } from './utils'

// eslint-disable-next-line @typescript-eslint/ban-types
export class PropsManager<TProps extends Record<string, any>> {
	/**
	 * type of callback function
	 */
	private _callbackTemplate: (event: {
		changedKeys: Array<keyof TProps>
		trigger: Array<keyof TProps> // @deprecated rename as changedKeys
		currentProps: Partial<TProps>
	}) => Promise<void> | void

	private _props: TProps = {} as TProps // init, safe here
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
	 *
	 * @return A Promise indicating if all the listeners has been trigged
	 */
	set(props: Partial<TProps>): Promise<void> {
		const changedKeys = deepDiffProps(props, this._props)

		if (changedKeys.length === 0) {
			return new Promise((resolve, reject) => {
				resolve()
			})
		}

		this._props = {
			...this._props,
			...props,
		}

		Object.freeze(this._props)

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

		const promises = [] as Array<Promise<void> | void>
		callbackKeys.forEach((listenedChangedKeys, callback) => {
			const res = callback({
				changedKeys: listenedChangedKeys,
				trigger: listenedChangedKeys,
				currentProps: this._props,
			})
			promises.push(res)
		})

		// it's allowed to pass a array of non-promises element
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all#return_value
		// @note do not use async/await so that above code can be executed synchronously
		return new Promise<void>((resolve, reject) => {
			Promise.all(promises)
				.then(() => {
					resolve()
				})
				.catch((e) => {
					reject(e)
				})
		})
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
			/**
			 * frozen object
			 */
			currentProps: Partial<TProps>
		}) => Promise<void> | void,
		immediately?: boolean
	): Promise<void> {
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i]
			let listeners = this._listeners.get(key)
			if (!listeners) {
				listeners = new Set()
				this._listeners.set(key, listeners)
			}

			listeners.add(callback as any)
		}

		const currentProps = this._props

		return (async () => {
			if (immediately) {
				return await callback({
					changedKeys: [] as any,
					trigger: [] as any,
					currentProps,
				})
			} else {
				return
			}
		})()
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
const a = new PropsManager<{ cc: 'dd' | 'ee'; ff: 'gg' | 'kk' }>()
a.listen(['cc'], async (event) => {})
a.listen(['cc', 'ff'], async (event) => {
	event.trigger
})
// a.listen(['cc', 'hh'], async (event) => {})
