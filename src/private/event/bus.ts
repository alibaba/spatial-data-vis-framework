import type { AppBase } from '../base/AppBase'
import type { BusEventMap, CustomEvent, CustomEventType } from './events'

/**
 * 事件总线代理
 */
export class EventBusAgent {
	#app: AppBase
	#target: any
	#handlerWrappers = new WeakMap<Fun, Fun>()
	#listeners = [] as { type; handlerWrapper }[]
	#autoDisposers = [] as Fun[]

	constructor(app: AppBase, target: any) {
		this.#app = app
		this.#target = target
	}

	/**
	 * 监听事件
	 */
	on<T extends keyof BusEventMap>(
		type: T,
		handler: (e: T extends CustomEventType ? CustomEvent<T> : BusEventMap[T]) => void
	) {
		const app = this.#app
		const target = this.#target
		const handlerWrappers = this.#handlerWrappers

		const handlerWrapper = (e: any) => {
			// @note 这里不能 spread，因为一些事件对象是可写的

			Object.defineProperty(e, 'currentTarget', {
				value: target,
				writable: false,
				enumerable: true,
				configurable: true,
			})

			handler(e)
		}
		handlerWrappers.set(handler, handlerWrapper)

		app.addEventListener(type, handlerWrapper)
		this.#listeners.push({ type, handlerWrapper })

		// 自动清除
		// @note dispatcher 必须有 dispose 事件才能生效
		const autoDisposer = () => app.removeEventListener(type, handlerWrapper)
		app.addEventListener('dispose', autoDisposer)
		this.#autoDisposers.push(autoDisposer)

		// start 事件的特殊处理
		if (type === 'start' && app.started) {
			handlerWrapper({ type, target: app })
		}
	}

	/**
	 * 停止监听事件
	 * @note 只允许通过同一个 EventBusAgent 注册的 handler
	 */
	off<T extends keyof BusEventMap>(type: T, handler: (e: BusEventMap[T]) => void) {
		const app = this.#app
		const handlerWrappers = this.#handlerWrappers

		const handlerWrapper = handlerWrappers.get(handler)
		if (!handlerWrapper) {
			console.warn(`handler ${handler} is not registered`)
		} else {
			app.removeEventListener(type, handlerWrapper)
		}
	}

	emit<T extends CustomEventType>(type: T, data: Omit<CustomEvent[T], 'type' | 'target'>) {
		validateCustomEventType(type)
		this.#app.dispatchEvent({ ...data, type, target: this.#target })
	}

	dispose() {
		// 清除所有handler
		this.#listeners.forEach((listener) => {
			this.#app.removeEventListener(listener.type, listener.handlerWrapper)
		})

		// 清除所有自动清除器
		this.#autoDisposers.forEach((autoDisposer) => {
			this.#app.removeEventListener('dispose', autoDisposer)
		})
	}
}

// 类型测试

// const a = new EventBusAgent({} as EventDispatcher, null)

// a.on('afterInit', (e) => {
// 	e.data // expect error
// 	e.currentTarget = 1 // expect error
// })

// a.on('beforeUpdateData', (e) => {
// 	e.value = 2
// 	e.dataStubID = 1 // expect error
// 	e.currentTarget = 1 // expect error
// })

// a.on('$custom', (e) => {
// 	e.type
// })

// // expect error
// a.on('custom', (e) => {
// 	e.type
// })

type Fun = (...args: any[]) => any

function validateCustomEventType(type: string) {
	if (!type.startsWith('$')) {
		throw new Error(`event type "${type}" is not valid custom event type`)
	}
}
