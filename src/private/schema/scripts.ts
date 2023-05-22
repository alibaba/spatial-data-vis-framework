import type { BusEventMap } from '../event/events'

/**
 * Script Config
 * @experimental Draft Version API. May change in the future.
 */
export type ScriptConfig = {
	/**
	 * 脚本名称，仅用于可读性
	 */
	name: string
	/**
	 * 脚本ID，用于唯一标识脚本。应该自动生成，不允许用户填写
	 */
	id: string

	/**
	 * 脚本类型，目前只支持 'bus' （总线事件脚本）
	 *
	 * - bus: polaris app events dispatched by EventBus.
	 * - layer: Polaris Layer Events.
	 * @note currently only support `bus`
	 */
	type: 'bus'

	/**
	 * 监听的事件，type 为 bus 时，支持所有内部事件外加一个 `scriptInit` 事件，UI默认应选择 `scriptInit`
	 *
	 * bus event type
	 * - all the internal and custom events are supported. {@link [@BusEvents](../event/events.ts)}
	 * - `scriptInit` is a special event
	 *   - happens when the script is initialized before AfterInitEvent
	 *   - `event.target` is `null` (because PolarisApp is not yet inited)
	 *   - `event.currentTarget` is `null` (because the script is not yet attached to any object)
	 *   - `event.busAgent` can be used to add more event listeners to the eventBus
	 */
	eventType: keyof BusEventMap | 'scriptInit'

	/**
	 * 脚本内容，是个js函数体的字符串
	 *
	 * event handler function body (as js code text)
	 */
	handler: string

	/**
	 * 该脚本都绑定在那些对象上
	 */
	targets: { type: 'layer' | 'stage' | 'app'; id: string }[]
}
