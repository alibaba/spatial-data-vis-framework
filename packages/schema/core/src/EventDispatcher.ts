/* eslint-disable @typescript-eslint/ban-types */
/**
 * Copyright (C) 2022 Alibaba Group Holding Limited
 * All rights reserved.
 *
 * @class EventDispatcher
 * @description A fully-typed, extendable event dispatcher with similar api of DOM:EventTarget.
 * @author Simon
 */

/**
 * options
 * @note drop DOM related options
 */
export interface EventOptions {
	/**
	 * A boolean value indicating that the listener should be invoked at most once after
	 * being added. If true, the listener would be automatically removed when invoked.
	 *
	 * @default undefined/false
	 */
	once?: boolean
}

/**
 * An object that dispatch events.
 *
 * Use exactly same API with {@link [DOM::EventTarget](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)}.
 * However Polaris shouldn't rely on DOM environment. So implement them here.
 *
 * @note inspired by {@link [three.js](https://github.com/mrdoob/eventdispatcher.js/)}
 */
export class EventDispatcher<
	/**
	 * Event type names and their event object interface
	 */
	TEventTypes extends { [key: string]: object } = {} /* {} save here */
> {
	private _listeners = {} as any
	private _options = new WeakMap<Function /* Function safe here */, EventOptions>()

	readonly isEventDispatcher = true

	addEventListener<TEventTypeName extends keyof TEventTypes>(
		/**
		 * type of the event
		 */
		type: TEventTypeName,
		/**
		 * callback function for the event
		 */
		listener: (
			/**
			 * emitted event.
			 */
			event: TEventTypes[TEventTypeName] & {
				target: any // self
				type: TEventTypeName
			}
		) => void,
		/**
		 * An object that specifies characteristics about the event listener
		 */
		options?: EventOptions
	): void {
		const listeners = this._listeners

		if (listeners[type] === undefined) {
			listeners[type] = []
		}

		if (listeners[type].indexOf(listener) === -1) {
			listeners[type].push(listener)
			if (options !== undefined) {
				this._options.set(listener, options)
			}
		}
	}

	removeEventListener<TEventTypeName extends keyof TEventTypes>(
		/**
		 * type of the event
		 */
		type: TEventTypeName,
		/**
		 * callback function for the event
		 */
		listener: (
			/**
			 * emitted event.
			 */
			event: TEventTypes[TEventTypeName] & {
				target: any // self
				type: TEventTypeName
			}
		) => void
	): void {
		const listeners = this._listeners
		const listenerArray = listeners[type]

		if (listenerArray !== undefined) {
			const index = listenerArray.indexOf(listener)

			if (index !== -1) {
				listenerArray.splice(index, 1)

				// @note no need to remove options
			}
		}
	}

	dispatchEvent<TEventTypeName extends keyof TEventTypes>(
		event: TEventTypes[TEventTypeName] & {
			/**
			 * assign the event type
			 */
			type: TEventTypeName
			/**
			 * optional event target. if not specified, target will be this(EventDispatcher)
			 */
			target?: any
		}
	): void {
		// find the type of the event listener
		// @note nor necessary since won't affect user
		type Listener = (
			event: TEventTypes[TEventTypeName] & {
				target: any // self
				type: TEventTypeName
			}
		) => void

		if (!event.type) {
			throw new Error('event.type is required')
		}

		const listeners = this._listeners
		const listenerArray = listeners[event.type]

		if (listenerArray !== undefined) {
			const eventOut = event as any

			if (event.target === undefined) {
				eventOut.target = this
			}

			// for safety
			Object.freeze(eventOut)

			// Make a copy, in case listeners are removed while iterating.
			const array = listenerArray.slice(0)

			for (let i = 0, l = array.length; i < l; i++) {
				const listener = array[i] as Listener

				listener.call(this, eventOut)

				if (this._options.get(listener)?.once) {
					this.removeEventListener(event.type, listener)
				}
			}
		}
	}

	removeAllEventListeners<TEventTypeName extends keyof TEventTypes>(type: TEventTypeName) {
		const listeners = this._listeners

		if (listeners[type] !== undefined) {
			listeners[type] = []
		}
	}

	/**
	 * dispatch an event to a specific listener
	 * @node use this only if you know what you're doing
	 * @deprecated may be removed in future versions
	 */
	protected dispatchAnEvent<TEventTypeName extends keyof TEventTypes>(
		event: TEventTypes[TEventTypeName] & {
			/**
			 * assign the event type
			 */
			type: TEventTypeName
			/**
			 * optional event target. if not specified, target will be this(EventDispatcher)
			 */
			target?: any
		},
		listener: (
			event: TEventTypes[TEventTypeName] & {
				target: any // self
				type: TEventTypeName
			}
		) => void
	): void {
		if (!event.type) {
			throw new Error('event.type is required')
		}

		const eventOut = event as any

		if (event.target === undefined) {
			eventOut.target = this
		}

		// for safety
		Object.freeze(eventOut)

		listener.call(this, eventOut)

		if (this._options.get(listener)?.once) {
			this.removeEventListener(event.type, listener)
		}
	}
}

// type test code
// const e = new EventDispatcher<{ aaa: { data: any }; add: { parent: any } }>()
// e.addEventListener('aaa', (event) => {})
// e.addEventListener('add', (event) => {})
// e.addEventListener('ccc', (event) => {})
// e.removeEventListener('aaa', (event) => {})
// e.removeEventListener('add', (event) => {})
// e.dispatchEvent({ type: 'aaa', data: {} })
// e.dispatchEvent({ type: 'add', parent: {} })
// e.dispatchEvent({ type: 'bbb', parent: {} })
// e.dispatchEvent({ type: 'aaa', parent: {} })
