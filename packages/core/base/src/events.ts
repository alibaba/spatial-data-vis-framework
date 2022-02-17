/**
 * Layer Lifecycle and events.
 */

import type { Projection } from '@polaris.gl/projection'
import type { Timeline } from 'ani-timeline'
import type { CameraProxy } from 'camera-proxy'
import type { AbstractNode } from './AbstractNode'
export type { EventBase, EventMapBase, DefaultEventMap } from './EventDispatcher'
import type { PickEventResult } from './Layer'
import type { AbstractPolaris } from './Polaris'

/**
 * @description
 *
 * Events interface is a part of every classes, and inherit along with classes.
 *
 * 		@class_inheritance
 * 		EventDispatcher -> AbstractNode -> AbstractLayer -> Layer -> StandardLayer
 * 												└-> AbstractPolaris -> PolarisGSI
 * 		@event_inheritance
 * 		AbstractNodeEvents ⊆ AbstractLayerEvents ⊆ LayerEvents ⊆ StandardLayer
 * 									└-⊆ AbstractPolarisEvents ⊆ PolarisGSIEvents
 *
 * The lifecycle of a layer has 3 stages. Each of which corresponding events are
 * triggered in certain order.
 *
 * 		@stage_0 initialization
 * 		Events(and methods) triggered in the following order:
 *
 * 		0. `Layer.constructor`
 * 		1. `AddEvent` (once)
 * 		2. `RootChangeEvent` (at least once, until init)
 * 		3. `Layer.init` and `InitEvent` (once, after the layer is added to a polaris
 * 			scene, so that instance of Polaris/Timeline/Projection can be resolved)
 * 		4. `ViewChangeEvent` (once, right before first rendering)
 *
 * 		@stage_1 rendering
 * 		Events of this stage may happen multiple times during rendering.
 * 		**NO ORDER GUARANTEED.**
 *
 * 		- `BeforeRenderEvent` and `AfterRenderEvent` (every frame for visible layers)
 * 		- `ViewChangeEvent` (every time camera, canvas or viewport changed)
 * 		- `PickEvent` and `HoverEvent` (when mouse moved, only if you enabled picking
 * 			on both layer and polaris instance)
 *
 *
 * 		@stage_2 deconstruct
 * 		1. `RemoveEvent` (only happen once if you implicitly remove a layer)
 * 		2. `Layer.dispose`
 *
 * @note
 * - Layer.watchProps is not a part of lifecycle events. Props change may happen
 * 		before any lifecycle events.
 * - Events do not `flow` like DOMEvent. An Event will be dispatched to THE
 * 		corresponding layer directly. 不存在冒泡与捕获行为.
 * - If a Layer is never added to a polaris scene, `InitEvent` will never be
 * 		triggered. So you may want to check `Layer.inited` in `Layer.dispose`
 *
 * @suggestion
 * Write everything in the `InitEvent` listener, including watchProps, to avoid mistakes.
 */

/**
 * @section AbstractNodeEvents
 * @description
 * tree and scene-graph related events
 */

/**
 * the event when this node is added to a parent node
 * @note will only happen once, because node can only be added once.
 * @note if the node is already added. this event will not fire
 */
type AddEvent = { type: 'add'; parent: AbstractNode }
/**
 * the event when this node is removed from its parent node
 * @note will only happen once, because node can only be added once.
 * @note if the node is already removed. this event will not fire
 */
type RemoveEvent = { type: 'remove'; parent: AbstractNode }
/**
 * the event when this node is removed from its parent node
 * @note will only happen once, because node can only be added once.
 * @note if the node is already removed. this event will not fire
 */
type RootChangeEvent = { type: 'rootChange'; root: AbstractNode | null }

export type AbstractNodeEvents = {
	add: AddEvent
	remove: RemoveEvent
	rootChange: RootChangeEvent
}

/**
 * @section AbstractLayerEvents
 * @description
 * events shared between layer and polaris
 */

/**
 * the event when visibility change
 */
type VisibilityChangeEvent = { type: 'visibilityChange' }
/**
 * the event when view(canvas) or camera state change
 */
type ViewChangeEvent = {
	type: 'viewChange'
	cameraProxy: CameraProxy
	polaris: AbstractPolaris /* typeof Polaris */
}
/**
 * the event triggered before every time this layer is rendered
 * @triggered every frame
 */
type BeforeRenderEvent = { type: 'beforeRender'; polaris: AbstractPolaris /* typeof Polaris */ }
/**
 * the event triggered after every time this layer is rendered
 * @triggered every frame
 */
type AfterRenderEvent = { type: 'afterRender'; polaris: AbstractPolaris /* typeof Polaris */ }

export type AbstractLayerEvents = AbstractNodeEvents & {
	visibilityChange: VisibilityChangeEvent
	viewChange: ViewChangeEvent
	beforeRender: BeforeRenderEvent
	afterRender: AfterRenderEvent
}

/**
 * @section LayerEvents
 * @description
 * events shared between layer and polaris
 */

/**
 * the event when this layer is mouse-picked
 */
type PickEvent = { type: 'pick'; result?: PickEventResult }
/**
 * the event when this layer is mouse-hovered
 */
type HoverEvent = { type: 'hover'; result?: PickEventResult }
/**
 * the event when this layer is added to a polaris tree.
 * @note use this event to get instances of projection, timeline, polaris
 */
type InitEvent = {
	type: 'init'
	projection: Projection
	timeline: Timeline
	polaris: AbstractPolaris
}
/**
 * the event when this layer is added to a polaris tree.
 * @note use this event to get instances of projection, timeline, polaris
 * @deprecated
 */
type AfterInitEvent = {
	type: 'afterInit'
	projection: Projection
	timeline: Timeline
	polaris: AbstractPolaris
}

export type LayerEvents = AbstractLayerEvents & {
	pick: PickEvent
	hover: HoverEvent
	init: InitEvent
	afterInit: AfterInitEvent
}

/**
 * @section AbstractPolarisEvents
 * @description
 * events shared between layer and polaris
 */

export type AbstractPolarisEvents = AbstractLayerEvents & {
	add: never
	remove: never
	rootChange: never
}
