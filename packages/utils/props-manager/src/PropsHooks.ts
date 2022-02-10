/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * 行为类似于 React Hooks 中的 useMemo / useCallback
 *
 * 但是需要显式实例化一个对象并通过方法调用。
 *
 * React 之所以能*不用* class 调用 hook，是因为限制了 use__ 只能在函数组件中调用，函数组建编译后会被wrap
 * 进入函数组件的时候会 reset module scope 中存储的 hook 对象
 *
 * 每一组 props 就需要一个对象
 *
 * @note 几乎没有实用价值
 */
export class PropsHook {
	private props: Array<any> = []

	useProps(usage: () => void, props: Array<any>): void {
		const prevProps = this.props
		const nextProps = props

		if (areHookInputsEqual(nextProps, prevProps)) {
			// do nothing
			return
		} else {
			this.props = nextProps
			usage()
			return
		}
	}
}

/**
 * 可以使用装饰器让用户显式地 reset older，然后像react一样完全依赖older判断当前是哪个hook
 */

const hooksRefs = new WeakMap<any, Map<symbol, any[][]>>()

let currentHook: any[][]
let currentPropsPointer = 0

export function widthHooks(target, name, descriptor) {
	const symbol = Symbol('hook symbol')
	const original = descriptor.value
	descriptor.value = function (...args) {
		// find and reset hook

		// gc friendly when the whole instance is disposed
		let currentHooks = hooksRefs.get(this)
		if (!currentHooks) {
			currentHooks = new Map<symbol, any[][]>()
			hooksRefs.set(this, currentHooks)
		}

		let hook = currentHooks.get(symbol)
		if (!hook) {
			hook = [[]]
			currentHooks.set(symbol, hook)
		}
		currentHook = hook
		currentPropsPointer = 0

		original.apply(this, args)
	}
}

export function useProps(usage: () => void, props: Array<any>): void {
	const prevProps = currentHook[currentPropsPointer]
	const nextProps = props

	if (areHookInputsEqual(nextProps, prevProps)) {
		// do nothing
	} else {
		currentHook[currentPropsPointer] = nextProps
		usage()
	}

	currentPropsPointer++
}

/**
 * shallow compare two arrays
 */
function areHookInputsEqual(nextDeps: Array<any>, prevDeps: Array<any>) {
	// Don't bother comparing lengths in prod because these arrays should be
	// passed inline.

	for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
		if (is(nextDeps[i], prevDeps[i])) {
			continue
		}
		return false
	}
	return true
}

/**
 * inlined Object.is polyfill to avoid requiring consumers ship their own
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
 */
function is(x: any, y: any) {
	return (
		(x === y && (x !== 0 || 1 / x === 1 / y)) || (x !== x && y !== y) // eslint-disable-line no-self-compare
	)
}

// test
// const a = new PropsManager<{ cc: 'dd' | 'ee'; ff: 'gg' | 'kk' }>()
// a.listen(['cc'], async (event) => {})
// a.listen(['cc', 'ff'], async (event) => {
// 	event.trigger
// })
// a.listen(['cc', 'hh'], async (event) => {})
