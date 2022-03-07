// utility

import type { EventBase } from './EventDispatcher'
import type { AbstractLayer } from './Layer'
import type { AbstractPolaris } from './Polaris'

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

/**
 * check view change for a layer (including polaris itself)
 */
export function checkViewChange(polaris: AbstractPolaris, layer: AbstractLayer) {
	const newStatesCode = polaris.cameraProxy.statesCode
	const newWidth = polaris.width
	const newHeight = polaris.height
	const newRatio = polaris.ratio

	let viewStates = layerViewStates.get(layer)
	if (!viewStates) {
		viewStates = {} as ViewStates
		layerViewStates.set(layer, viewStates)
	}

	if (
		viewStates.width !== newWidth ||
		viewStates.height !== newHeight ||
		viewStates.ratio !== newRatio ||
		viewStates.statesCode !== newStatesCode
	) {
		viewStates.width = newWidth
		viewStates.height = newHeight
		viewStates.ratio = newRatio
		viewStates.statesCode = newStatesCode
		layer.dispatchEvent({ type: 'viewChange', cameraProxy: polaris.cameraProxy, polaris })
	}
}

/**
 * store view states of layers, used to emit viewChange event on layers
 */
export const layerViewStates = new WeakMap<AbstractLayer, ViewStates>()

/**
 * States related to viewChange event
 */
type ViewStates = {
	width: number
	height: number
	ratio: number
	statesCode: string
}
