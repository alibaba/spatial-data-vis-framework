// utility

import type { EventBase } from './EventDispatcher'

/**
 * utility type to map event types to event
 *
 * @example
 * @input
 * {type: 'a', data: number} | {type: 'b', data: boolean}
 * @output
 * {
 * 		a: {type: 'a', data: number}
 * 		b: {type: 'b', data: boolean}
 * }
 */
export type EventsMap<EventUnion extends EventBase> = {
	[P in EventUnion['type']]: Extract<EventUnion, { type: P }>
}

// export type ExtendEvents<A extends EventBase, B extends EventBase, U = A | B> = U
// export type ExtendEvents<
// 	A extends EventBase,
// 	B extends EventBase,
// 	U = { [P in A['type']]: Extract<A, { type: P }> } & { [Q in B['type']]: Extract<B, { type: Q }> }
// > = U
//  export type ExtendEvents<
// 	 A extends EventBase,
// 	 B extends EventBase,
// 	 U = { [P in A['type']]: Extract<A, { type: P }> } & { [Q in B['type']]: Extract<B, { type: Q }> }
//  > = U
// export type ExtendEvents<A extends EventBase, B extends EventBase, U = A | B> = {[P in A['type'] | B['type']]: number}

const DEBUG = true
export const debug: typeof console.debug = (...args) => {
	if (DEBUG) {
		console.debug('debug:', args)
	}
}
