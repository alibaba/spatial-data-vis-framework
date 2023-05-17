/**
 * @class EventDispatcher
 * @description A fully-typed, extendable event dispatcher with similar api of DOM:EventTarget.
 * @author Simon
 * @note copy from @polaris.gl/base,
 * @edit add `dispatchEvent` method type check
 * @edit rm `dispatchAnEvent` method
 * @edit disable `target` override, `type` is the only resolved property
 * @edit disable event frozen. alow listeners to modify the event object
 * @todo merge back to @polaris.gl/base
 */

/**
 * An object that dispatches events.
 *
 * @generic {TEventTypes} Event type names and their event object interface
 *
 * Use exactly same API with {@link [DOM::EventTarget](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)}.
 * However Polaris shouldn't rely on DOM environment. So implement them here.
 *
 * @note inspired by {@link [three.js](https://github.com/mrdoob/eventdispatcher.js/)}
 *
 */
export class EventDispatcher<TEventTypes extends EventMapBase = any> {
	private readonly _listeners = {} as any
	// eslint-disable-next-line @typescript-eslint/ban-types
	private readonly _options = new WeakMap<Function, ListenerOptions>()

	readonly isEventDispatcher = true

	addEventListener<TEventTypeName extends keyof TEventTypes>(
		/**
		 * type of the event
		 */
		type: TEventTypeName,
		/**
		 * callback function for the event
		 */
		listener: ListenerCbk<TEventTypes, TEventTypeName>,
		/**
		 * An object that specifies characteristics about the event listener
		 */
		options?: ListenerOptions
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

		// reflection api
		// used to add custom behaviors for `addEventListener` method
		this.dispatchEvent({ type: 'addEventListener', source: { type, listener, options } } as any)
	}

	removeEventListener<TEventTypeName extends keyof TEventTypes>(
		/**
		 * type of the event
		 */
		type: TEventTypeName,
		/**
		 * callback function for the event
		 */
		listener: ListenerCbk<TEventTypes, TEventTypeName>
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
		}
	): void {
		if (!event.type) {
			throw new Error('event.type is required')
		}

		const listeners = this._listeners
		const listenerArray = listeners[event.type]

		if (listenerArray !== undefined) {
			// Make a copy, in case listeners are removed while iterating.
			const array = listenerArray.slice(0)

			for (let i = 0, l = array.length; i < l; i++) {
				const listener = array[i]

				listener.call(this, event)

				if (this._options.get(listener)?.once) {
					this.removeEventListener(event.type, listener)
				}
			}
		}
	}

	removeAllEventListeners<TEventTypeName extends keyof TEventTypes>(type: TEventTypeName): void {
		const listeners = this._listeners

		if (listeners[type] !== undefined) {
			listeners[type] = []
		}
	}
}
/**
 * options
 * @note drop DOM related options
 */
export interface ListenerOptions {
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
export type ListenerCbk<
	TEventTypes extends Record<string, Record<string, any>>,
	TName extends keyof TEventTypes
> = (
	/**
	 * emitted event.
	 */
	// event: TEventTypes[TName] & {
	// 	target: EventDispatcher<TEventTypes> // self
	// 	type: TName
	// }
	event: TEventTypes[TName]
) => void

export interface EventBase {
	type: string
}

export type EventMapBase = Record<string, EventBase>
export type DefaultEventMap = Record<string, never>

// type test code
// const e = new EventDispatcher<{
// 	aaa: { type: 'aaa'; data: any }
// 	add: { type: 'add'; parent: any }
// }>()
// const e = new EventDispatcher()
// e.addEventListener('aaa', (event) => {event})
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
