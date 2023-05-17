import type { AppBase } from '../base/AppBase'
import type { EventDispatcher } from '../config/EventDispatcher'
import type { CustomEvent, CustomEventType, EventMap } from './events'

/**
 * 事件总线代理
 */
export class EventBusAgent {
	#app: AppBase
	#target: any
	#handlerWrappers = new WeakMap<Fun, Fun>()

	constructor(app: AppBase, target: any) {
		this.#app = app
		this.#target = target
	}

	/**
	 * 监听事件
	 */
	on<T extends keyof EventMap>(
		type: T,
		handler: (e: T extends CustomEventType ? CustomEvent<T> : EventMap[T]) => void
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

		// 自动清除
		// @note dispatcher 必须有 dispose 事件才能生效
		app.addEventListener('dispose', () => {
			app.removeEventListener(type, handlerWrapper)
		})

		// start 事件的特殊处理
		if (type === 'start' && app.started) {
			handlerWrapper({ type, target: app })
		}
	}

	/**
	 * 停止监听事件
	 * @note 只允许通过同一个 EventBusAgent 注册的 handler
	 */
	off<T extends keyof EventMap>(type: T, handler: (e: EventMap[T]) => void) {
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
