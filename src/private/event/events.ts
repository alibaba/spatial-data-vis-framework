/**
 * @file
 * Bus Event Types
 */
import type { AppBase } from '../base/AppBase'

/**
 * Event Base Type
 */
export type EventBase = {
	/**
	 * 事件类型（事件名）
	 */
	readonly type: string

	/**
	 * 事件触发者
	 * - the object that dispatches the event (aka. the emitter)
	 */
	readonly target: unknown

	/**
	 * 事件监听者/事件监听器挂载的对象
	 * - the listener
	 * - the object that this listener is attached to
	 */
	readonly currentTarget?: any
}

/**
 * Polaris App 的内部事件基类
 */
type InternalEventBase = EventBase & {
	readonly target: AppBase
}

/**
 * 实例构造完成时触发
 * @note new App 构造完成后进行监听，将**错过**该事件
 * @usage 该事件用于内部流程和脚本系统
 */
export type AfterInitEvent = InternalEventBase & {
	readonly type: 'afterInit'
}

/**
 * App 开始运行后、首次 tick 前触发
 * @note 该事件不会错过，在 App 开始运行后添加监听，将**立刻触发**该事件
 * @usage 用于广义的表达 应用、layer或脚本生命周期的开始
 */
export type StartEvent = InternalEventBase & {
	readonly type: 'start'
}

/**
 * 实例销毁过程中触发
 */
export type DisposeEvent = InternalEventBase & {
	readonly type: 'dispose'
}

/**
 * 场景切换前触发 (包括初始化场景切换)
 * @usage 用于拦截和修改切换效果
 * @rule An Event starts width `Before` is a synchronous event. Its handler can edit the input value to change the behavior after.
 */
export type BeforeSceneChangeEvent = InternalEventBase & {
	readonly type: 'beforeSceneChange'
	readonly prevScene: string
	readonly nextScene: string
	duration?: number
	skipCamera?: boolean
}

/**
 * 场景切换后触发
 */
export type AfterSceneChangeEvent = InternalEventBase & {
	readonly type: 'afterSceneChange'
	readonly prevScene: string
	readonly nextScene: string
}

/**
 * 每帧 render 之前触发
 */
export type TickEvent = InternalEventBase & {
	readonly type: 'tick'
}

/**
 * 调用 updateDataStub 后、分发数据给使用者前触发
 * @usage
 * 可用于拦截数据更新，进行校验或根据数据触发其他行为
 * @usage
 * 也可用做filter，修改数据
 * @caution
 * - Polaris App 的数据插槽会被多个layer使用，不可用此事件为某个layer修改数据，会影响其他layer
 * - value 只存一份，如果有多个 listener 修改同一个 dataStub, 会相互覆盖
 * - 不要假设多个 listener 之间的执行顺序
 * - 应将 value 视为 immutable，避免原地修改
 */
export type BeforeUpdateData = InternalEventBase & {
	readonly type: 'beforeUpdateData'
	readonly dataStubID: string
	value: any
}

/**
 * Polaris App 的所有内部事件类型
 */
export type InternalEvent =
	| AfterInitEvent
	| StartEvent
	| DisposeEvent
	| BeforeSceneChangeEvent
	| AfterSceneChangeEvent
	| TickEvent
	| BeforeUpdateData

export type CustomEventType = `$${string}`

export type CustomEvent<T extends CustomEventType = CustomEventType> = EventBase & {
	readonly type: T
	[key: string]: any
}

export type BusEventMap = EventsMap<InternalEvent | CustomEvent>

// utilities

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
type EventsMap<EventUnion extends EventBase> = {
	[P in EventUnion['type']]: Extract<EventUnion, { type: P }>
}
