/**
 * Layer Lifecycle and events.
 */

import type { Projection } from '@polaris.gl/projection'
import type { Timeline } from 'ani-timeline'
import type { CameraProxy } from 'camera-proxy'
import type { Node } from './Node'
export type { EventBase, EventMapBase, DefaultEventMap } from './EventDispatcher'
import type { PickEventResult } from './Layer'
import type { AbstractPolaris } from './Polaris'
import type { AbstractLayer } from './Layer'

/**
 * @description
 *
 * The lifecycle of a layer has 3 stages. In each of which corresponding events are
 * triggered in certain order.
 *
 * 		@stage_0 initialization
 * 		Events(and methods) triggered in the following order:
 *
 * 		0. `Layer.constructor`
 * 		1. `AddEvent` (once)
 * 		2. `RootChangeEvent` (at least once)
 * 		3. @deprecated `Layer.init` (once, if implemented)
 *      3. `InitEvent` (once, after the layer is added to a
 * 	        polaris scene, so that Polaris/Timeline/Projection can be resolved)
 * 		4. `AfterInitEvent` (once, after InitEvent is triggered)
 *
 * 		@stage_1 render loop
 * 		Events of this stage may happen multiple times during rendering.
 * 		**NO ORDER GUARANTEED.**
 *
 * 		- `BeforeRenderEvent` and `AfterRenderEvent` (every frame for visible layers)
 * 		- `ViewChangeEvent` (every time camera, canvas or viewport changed)
 * 		- `PickEvent` and `HoverEvent` (when mouse moved, only if you enabled picking
 * 			on both layer and polaris instance)
 *
 * 		@stage_2 deconstruction
 * 		1. `RemoveEvent` (only happen once if you implicitly remove a layer)
 * 		2. `Layer.dispose`
 *
 * A Polaris instance, as a special kind of Layer, is the root of the layer tree.
 * Hence, there are certain events that will never be triggered for it:
 *
 * 		- `AddEvent` & `RemoveEvent` & `RootChangeEvent` (root node doesn't have a parent)
 * 		- `InitEvent` & `AfterInitEvent` (Polaris is inited when instanced)
 * 		- `PickEvent` & `HoverEvent` (Polaris does not contain renderable contents)
 *
 * Events interfaces inherit along with classes.
 *
 * 		@class_inheritance
 * 		EventDispatcher -> Node -> AbstractLayer -> StandardLayer
 * 									 └-> AbstractPolaris -> PolarisGSI
 * 		@event_inheritance
 * 		NodeEvents ⊆ AbstractLayerEvents ⊆ StandardLayer
 * 							└-⊆ AbstractPolarisEvents ⊆ PolarisGSIEvents
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
 * @section NodeEvents
 * @description
 * tree and scene-graph related events
 */

/**
 * the event when this node is added to a parent node
 * @note will only happen once, because node can only be added once.
 * @note if the node is already added. this event will not fire
 */
type NodeAddEvent = { type: 'add'; parent: Node }
/**
 * the event when this node is removed from its parent node
 * @note will only happen once, because node can only be added once.
 * @note if the node is already removed. this event will not fire
 */
type NodeRemoveEvent = { type: 'remove'; parent: Node }
/**
 * the event when this node is removed from its parent node
 * @note will only happen once, because node can only be added once.
 * @note if the node is already removed. this event will not fire
 */
type NodeRootChangeEvent = { type: 'rootChange'; root: Node | null }

export type NodeEvents = {
	add: NodeAddEvent
	remove: NodeRemoveEvent
	rootChange: NodeRootChangeEvent
}

/**
 * @section AbstractLayerEvents
 * @description
 * events shared between layer and polaris
 */

/**
 * the event when this layer is added to a parent layer
 * @note will only happen once, because layer can only be added once.
 * @note if the layer is already added. this event will not fire
 */
type AddEvent = { type: 'add'; parent: AbstractLayer }
/**
 * the event when this layer is removed from its parent layer
 * @note will only happen once, because layer can only be added once.
 * @note if the layer is already removed. this event will not fire
 */
type RemoveEvent = { type: 'remove'; parent: AbstractLayer }
/**
 * the event when this layer is removed from its parent layer
 * @note will only happen once, because layer can only be added once.
 * @note if the layer is already removed. this event will not fire
 */
type RootChangeEvent = { type: 'rootChange'; root: AbstractLayer | null }

/**
 * the event when visibility change
 */
type VisibilityChangeEvent = { type: 'visibilityChange'; visible: boolean }
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
/**
 * the event triggered when an error is thrown from a callback function
 */
type ErrorEvent = { type: 'error'; error: Error; msg: any }

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

export type AbstractLayerEvents = {
	error: ErrorEvent
	add: AddEvent
	remove: RemoveEvent
	rootChange: RootChangeEvent
	visibilityChange: VisibilityChangeEvent
	viewChange: ViewChangeEvent
	beforeRender: BeforeRenderEvent
	afterRender: AfterRenderEvent
	pick: PickEvent
	hover: HoverEvent
	init: InitEvent
	afterInit: AfterInitEvent
}

/**
 * @deprecated renamed as {@link AbstractLayerEvents}
 */
export type LayerEvents = AbstractLayerEvents

/**
 * @section AbstractPolarisEvents
 * @description
 * events shared between layer and polaris
 */
export type AbstractPolarisEvents = AbstractLayerEvents & {
	add: never
	remove: never
	rootChange: never
	pick: never
	hover: never
	init: never
	afterInit: never

	// experiment
	tickError: {
		type: 'tickError'
		error: Error
	}
}
