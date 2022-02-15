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
export interface IEventDispatcher<
	TEventTypes extends Record<string, Record<string, any>> = Record<string, any>
> {
	readonly isEventDispatcher: true

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
	): void

	removeEventListener<TEventTypeName extends keyof TEventTypes>(
		/**
		 * type of the event
		 */
		type: TEventTypeName,
		/**
		 * callback function for the event
		 */
		listener: ListenerCbk<TEventTypes, TEventTypeName>
	): void

	dispatchEvent<TEventTypeName extends keyof TEventTypes>(
		event: Record<string, any> & {
			/**
			 * assign the event type
			 */
			type: TEventTypeName
		}
	): void

	removeAllEventListeners<TEventTypeName extends keyof TEventTypes>(type: TEventTypeName): void
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
	event: TEventTypes[TName] & {
		target: IEventDispatcher // self
		type: TName
	}
) => void

/**
 * event object passed to a callback
 */
export type CbkEvent<
	TEventTypes extends Record<string, Record<string, any>>,
	TName extends keyof TEventTypes
> = TEventTypes[TName] & {
	target: IEventDispatcher // self
	type: TName
}

// export function addEvents<TEvents extends Record<string, Record<string, any>>>(events: TEvents) {
// 	return function (constructor: Function)
// }

// type test code
// const e = new EventDispatcher<{ aaa: { data: any }; add: { parent: any } }>()
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
