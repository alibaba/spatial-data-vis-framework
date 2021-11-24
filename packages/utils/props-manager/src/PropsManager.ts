/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { default as minBy } from 'lodash/minBy'
import { default as maxBy } from 'lodash/maxBy'
import { default as isEqual } from 'lodash/isEqual'
import { default as getByPath } from 'lodash/get'
import { default as partition } from 'lodash/partition'
import { default as isEmpty } from 'lodash/isEmpty'

export type CallBack = { (event: Event, ...args: any[]): void }

const REGX_HTTP_HTTPS = /^(https:\/\/|http:\/\/)\.*/
const REGX_GLB_GLTF = /\.(glb|gltf)$/

export interface Event {
	type: string
	trigger: string | string[]
	[property: string]: any
}

class EventEmitter {
	listeners: Map<string, CallBack> = new Map()

	on(type: string, callback: CallBack) {
		this.listeners.set(type, callback)
	}

	emit(event: Event) {
		const callback = this.listeners.get(event.type)
		callback?.apply(this, [event])
	}

	getCallback(type: string) {
		return this.listeners.get(type)
	}
}

function shallowDiffProps(newProps, oldProps) {
	const diffProps: Array<string> = []
	for (const key in newProps) {
		if (!isEqual(newProps[key], oldProps[key])) {
			diffProps.push(key)
		}
	}
	return diffProps
}

function needsUpdate(key: string, diffProps: Array<string>) {
	for (let i = 0; i < diffProps.length; i++) {
		if (key.indexOf(diffProps[i]) > -1) {
			return diffProps[i]
		}
	}
	return false
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

	// transform 后的数据
	cacheData: any = null

	// cache由getXXX生成的Functions
	cachedGetterFuncs = new Map<string, (...args: any[]) => void>()

	/**
	 * 初始化/更新属性，可以是增量更新
	 * @param newProps
	 */
	set(newProps: any) {
		// 获取新旧 Props 的差异
		const diffProps = shallowDiffProps(newProps, this.props)
		const partitionDiffProps = partition(
			diffProps,
			(props) => props === 'data' || props === 'dataTransform'
		)
		const diffDataProps = partitionDiffProps[0]
		const diffOtherProps = partitionDiffProps[1]
		// 更新旧 Props
		this.props = {
			...this.props,
			...newProps,
		}
		if (!isEmpty(diffDataProps)) {
			_getCacheData(this.props['data']).then((cacheData) => {
				this.cacheData = cacheData
				// 数据相关属性有变化
				// 非数据相关属性有变化
				this.trigger(diffOtherProps, diffDataProps)
			})
		} else {
			// 非数据相关属性有变化
			this.trigger(diffOtherProps)
		}
	}

	/**
	 * @fixed 若dataProps和normalProps存在共享同一个callback, 则只触发一次
	 * @param normalProps
	 * @param dataProps
	 */
	trigger(normalProps: string[], dataProps?: string[]) {
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

		keyMap.forEach((triggerProps, key) => {
			this.emit({
				type: key,
				trigger: triggerProps,
			})
		})
	}

	/**
	 * 获取属性对应的值，对 data 以及数据图形映射属性有特殊处理
	 * @fixed 将所有getter functions缓存起来，每次取值即可取到相同的function，避免diff时产生false positive。
	 * @param key
	 */
	get(key: string) {
		// 返回缓存后的数据
		if (key === 'data') {
			return this.cacheData
		}

		const value = this.props[key]

		// 处理 get 开头的数据图形映射属性，返回一个 mapping 函数，每个数据 item，可以映射为一个图形属性
		if (key.startsWith('get')) {
			if (typeof value === 'function') return value
			if (this.cachedGetterFuncs.has(key)) return this.cachedGetterFuncs.get(key)
			// if (value?.field && value?.range) {
			// 	let fn = d3Scale.scaleLinear().range(value.range)
			// 	if (value?.domain) {
			// 		fn = fn.domain(value.domain)
			// 	} else {
			// 		fn = fn.domain(this._getDataDomain(value.field))
			// 	}
			// 	const getter = (item) => fn(item[value['field']])
			// 	this.cachedGetterFuncs.set(key, getter)
			// 	return getter
			// }
			const getter = () => value
			this.cachedGetterFuncs.set(key, getter)
			return getter
		}
		return value
	}

	/**
	 * 注册属性变化监听器
	 * @param propsName
	 * @param callback
	 */
	listen(propsName: string | Array<string>, callback: CallBack) {
		if (typeof propsName === 'string') {
			propsName = [propsName]
		}
		const type = propsName.join(',')
		this.on(type, callback)

		// 注册完后，主动触发一次回调，方便 Layer 做初始化
		this.emit({
			type,
			trigger: 'initialize',
		})
	}

	private _getDataDomain(field) {
		const data = this.get('data')
		const minObj = minBy(data, (d) => d[field])
		const maxObj = maxBy(data, (d) => d[field])
		return [minObj?.[field], maxObj?.[field]]
	}
}
/** 获取缓存数据
 * 如果 data 是 url，协助请求并缓存，否则直接缓存
 * @param data GLB/GLTF | FeatureCollection | Array | url
 */
const _getCacheData = async (data) => {
	/**
	 * _data: GLB/GLTF、FeatureCollection、Array
	 */
	let cacheData = data
	if (REGX_HTTP_HTTPS.test(data)) {
		cacheData = await _fetchData(data)
	} else {
		cacheData = data
	}

	return cacheData
}
/** 获取资源
 * @param url 资源地址
 */
const _fetchData = async (url) => {
	const resp = await fetch(url)
	if (REGX_GLB_GLTF.test(url)) {
		const result = await resp.arrayBuffer()
		return result
	}
	const result = await resp.json()
	return result
}
