/**
 * Copyright (C) 2022 Alibaba Group Holding Limited
 * All rights reserved.
 *
 * @class EventDispatcher
 * @description A fully-typed, extendable event dispatcher with similar api of DOM:EventTarget.
 * @author Simon
 */

export interface EventBase {
	type: string
}

/**
 * An object that dispatches events.
 *
 * @generic {TEvents} Event type names and their event object interface
 *
 * Use exactly same API with {@link [DOM::EventTarget](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)}.
 * However Polaris shouldn't rely on DOM environment. So implement them here.
 *
 * @note inspired by {@link [three.js](https://github.com/mrdoob/eventdispatcher.js/)}
 *
 */
export class EventDispatcher<TEvents extends EventBase = EventBase> {
	#listeners = {} as any
	// eslint-disable-next-line @typescript-eslint/ban-types
	#options = new WeakMap<Function, ListenerOptions>()

	readonly isEventDispatcher: true

	addEventListener<TEventType extends TEvents['type']>(
		/**
		 * type of the event
		 */
		type: TEventType,
		/**
		 * callback function for the event
		 */
		listener: ListenerCbk<TEvents, TEventType>,
		/**
		 * An object that specifies characteristics about the event listener
		 */
		options?: ListenerOptions
	): void {
		const listeners = this.#listeners

		if (listeners[type] === undefined) {
			listeners[type] = []
		}

		if (listeners[type].indexOf(listener) === -1) {
			listeners[type].push(listener)
			if (options !== undefined) {
				this.#options.set(listener, options)
			}
		}
	}

	removeEventListener<TEventType extends TEvents['type']>(
		/**
		 * type of the event
		 */
		type: TEventType,
		/**
		 * callback function for the event
		 */
		listener: ListenerCbk<TEvents, TEventType>
	): void {
		const listeners = this.#listeners
		const listenerArray = listeners[type]

		if (listenerArray !== undefined) {
			const index = listenerArray.indexOf(listener)

			if (index !== -1) {
				listenerArray.splice(index, 1)

				// @note no need to remove options
			}
		}
	}

	dispatchEvent<TEventType extends TEvents['type']>(
		event: Extract<TEvents, { type: TEventType }>
		// event: { type: TEventType } & Extract<TEvents, { type: TEventType }>
		// event: { type: TEventType }
	): void {
		if (!event.type) {
			throw new Error('event.type is required')
		}

		const listeners = this.#listeners
		const listenerArray = listeners[event.type]

		if (listenerArray !== undefined) {
			const eventOut = event as any

			eventOut.target = this

			// for safety
			Object.freeze(eventOut)

			// Make a copy, in case listeners are removed while iterating.
			const array = listenerArray.slice(0)

			for (let i = 0, l = array.length; i < l; i++) {
				const listener = array[i]

				listener.call(this, eventOut)

				if (this.#options.get(listener)?.once) {
					this.removeEventListener(event.type, listener)
				}
			}
		}
	}

	removeAllEventListeners<TEventType extends TEvents['type']>(type: TEventType): void {
		const listeners = this.#listeners

		if (listeners[type] !== undefined) {
			listeners[type] = []
		}
	}

	/**
	 * dispatch an event to a specific listener
	 * @node use this only if you know what you're doing
	 * @deprecated may be removed in future versions
	 */
	protected dispatchAnEvent<TEventType extends TEvents['type']>(
		event: Extract<TEvents, { type: TEventType }>,
		listener: ListenerCbk<TEvents, TEventType>
	): void {
		if (!event.type) {
			throw new Error('event.type is required')
		}

		const eventOut = event as any

		eventOut.target = this

		// for safety
		Object.freeze(eventOut)

		listener.call(this, eventOut)

		if (this.#options.get(listener)?.once) {
			this.removeEventListener(event.type, listener)
		}
	}
}
/**
 * options
 * @note drop DOM related options
 */
interface ListenerOptions {
	/**
	 * A boolean value indicating that the listener should be invoked at most once after
	 * being added. If true, the listener would be automatically removed when invoked.
	 *
	 * @default undefined/false
	 */
	once?: boolean
}

/**
 * type of listener callback function
 */
type ListenerCbk<TEvents extends EventBase, TEventType extends TEvents['type']> = (
	/**
	 * emitted event.
	 */
	event: Extract<TEvents, { type: TEventType }>
) => void

// type test code
// const e = new EventDispatcher<{ type: 'aaa'; data: any } | { type: 'add'; parent: any }>()
// const e = new EventDispatcher()
// e.addEventListener('aaa', (event) => {})
// e.addEventListener('add', (event) => {})
// e.addEventListener('ccc', (event) => {})
// e.removeEventListener('aaa', (event) => {})
// e.removeEventListener('add', (event) => {})
// e.dispatchEvent({ type: 'aaa', data: {} })
// e.dispatchEvent({ type: 'add', parent: {} })
// e.dispatchEvent({ type: 'bbb', parent: {} })
// e.dispatchEvent({ type: 'aaa', parent: {} })

// const a : Record<string, any> & {'bb': number} = {bb:2}

// a.cc

// type a = keyof Record<string, any>
