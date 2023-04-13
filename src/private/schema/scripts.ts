import type { AbstractLayerEvents } from '@polaris.gl/base'

import type { App } from '../../apps/App'

export type ScriptConfig = {
	/**
	 * - bus: polaris app events dispatched by app event bus.
	 * - layer: Polaris Layer Events.
	 */
	type: 'bus' | 'layer'
	eventType: keyof AbstractLayerEvents | BusEventType
	handler: string
}

// the following will define PolarisApp::BusEvent

type BusEventType = 'beforeSceneChange' | 'afterSceneChange'

type BusEvent = {
	readonly type: BusEventType

	/**
	 * the object that dispatches the event (aka. the emitter)
	 */
	readonly target: object

	/**
	 * the object this script is attached to (aka. the listener)
	 */
	readonly currentTarget: object

	readonly app: App
}

/**
 * Event dispatched before scene change.
 * @rule An Event starts width `Before` is a synchronous event. Its handler can edit the input value to change the behavior after.
 */
type BeforeSceneChangeEvent = BusEvent & {
	readonly type: 'beforeSceneChange'
	readonly prevScene: string
	readonly nextScene: string
	duration: number
	skipCamera: boolean
}

// const e = {} as BeforeSceneChangeEvent
// e.type
