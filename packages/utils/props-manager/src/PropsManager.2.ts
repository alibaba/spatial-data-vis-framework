/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { default as isEqual } from 'lodash/isEqual'
import { default as partition } from 'lodash/partition'
import { default as isEmpty } from 'lodash/isEmpty'

export type EventCallBack = { (event: Event, done: () => void): void }

export interface Event {
	type: string[]
	trigger: string[]
	[property: string]: any
}

class EventEmitter {
	listeners: Map<string, EventCallBack> = new Map()

	on(type: string, callback: EventCallBack) {
		this.listeners.set(type, callback)
	}

	emit(event: Event): Promise<void> {
		const callback = this.listeners.get(event.type)
		return new Promise<void>((resolve) => {
			callback?.apply(this, [event, resolve])
		})
	}

	getCallback(type: string) {
		return this.listeners.get(type)
	}
}

/**
 * get changed props keys
 * @note using deep-diff algorithm, objects and arrays will be deep-diff
 * @note only check added and changed keys, not deleted keys
 */
function deepDiffProps(newProps: Record<string, any>, oldProps: Record<string, any>): string[] {
	const changedKeys: Array<string> = []

	const keys = Object.keys(newProps)
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i]
		if (!isEqual(newProps[key], oldProps[key])) {
			changedKeys.push(key)
		}
	}

	return changedKeys
}

function needsUpdate(key: string, diffProps: Array<string>) {
	for (let i = 0; i < diffProps.length; i++) {
		if (key.indexOf(diffProps[i]) > -1) {
			return diffProps[i]
		}
	}
	return false
}

function includes(array: string[], item: string): boolean {
	for (let i = 0; i < array.length; i++) {
		const element = array[i]
	}
}

/**
 * 属性管理 - 协助 Layer 管理 props
 * 1. 修改、监听、获取 props 值
 * 2. 缓存 transform 后的数据
 * 3. 将 'getXXX' 以 get 开头的 sacle 属性转换为 data mapping 回调函数
 */
export class PropsManager extends EventEmitter {
	// 当前的 props 属性
	props: any = {}

	/**
	 * 初始化/更新属性，可以是增量更新
	 * @param {*} newProps
	 * @param {() => void} [callback]
	 * @memberof PropsManager
	 */
	set(newProps: any, callback?: () => void): Promise<void> {
		// 获取新旧 Props 的差异
		const diffProps = deepDiffProps(newProps, this.props)
		const partitionDiffProps = partition(diffProps, (props) => props === 'data')
		const diffDataProps = partitionDiffProps[0]
		const diffOtherProps = partitionDiffProps[1]
		// 更新旧 Props
		this.props = {
			...this.props,
			...newProps,
		}

		return new Promise<void>((resolve) => {
			if (!isEmpty(diffDataProps)) {
				_getCacheData(this.props['data']).then((cacheData) => {
					this.cacheData = cacheData
					// 数据相关属性有变化
					// 非数据相关属性有变化
					this.trigger(diffOtherProps, diffDataProps).then(() => {
						if (callback) callback()
						resolve()
					})
				})
			} else {
				// 非数据相关属性有变化
				this.trigger(diffOtherProps).then(() => {
					if (callback) callback()
					resolve()
				})
			}
		})
	}

	/**
	 * @fixed 若dataProps和normalProps存在共享同一个callback, 则只触发一次
	 * @param normalProps
	 * @param dataProps
	 */
	trigger(normalProps: string[], dataProps?: string[]): Promise<void> {
		const keyMap = new Map<string, string[]>()

		// Find and set normalProps callback
		for (const key of this.listeners.keys()) {
			const trigger = needsUpdate(key, normalProps)
			if (trigger !== false) {
				const triggerProps = keyMap.get(key)
				if (triggerProps === undefined) {
					// Add normalProps keys into triggers arr
					keyMap.set(key, Array.from(normalProps))
				} else {
					// Add normalProps keys into triggers arr
					normalProps.forEach((prop) => {
						triggerProps.push(prop)
					})
				}
			}
		}

		// Find and set data callback
		if (dataProps) {
			for (const key of this.listeners.keys()) {
				const trigger = needsUpdate(key, dataProps)
				if (trigger !== false) {
					const triggerProps = keyMap.get(key)
					if (triggerProps === undefined) {
						keyMap.set(key, [trigger])
					} else {
						triggerProps.push(trigger)
					}
				}
			}
		}

		const emitPromises: Promise<any>[] = []
		keyMap.forEach((triggerProps, key) => {
			emitPromises.push(
				this.emit({
					type: key,
					trigger: triggerProps,
				})
			)
		})

		return new Promise<void>((resolve) => {
			Promise.all(emitPromises).then(() => resolve())
		})
	}

	/**
	 * 获取属性对应的值，对 data 以及数据图形映射属性有特殊处理
	 * @fixed 将所有getter functions缓存起来，每次取值即可取到相同的function，避免diff时产生false positive。
	 * @param key
	 */
	get(key: string) {
		const value = this.props[key]

		// 处理 get 开头的数据图形映射属性，返回一个 mapping 函数，每个数据 item，可以映射为一个图形属性
		if (key.startsWith('get')) {
			if (typeof value === 'function') return value
			const getter = () => value
			return getter
		}

		return value
	}

	/**
	 * 注册属性变化监听器
	 * @param propsName
	 * @param callback
	 */
	listen(propsName: string | Array<string>, callback: EventCallBack) {}
}
