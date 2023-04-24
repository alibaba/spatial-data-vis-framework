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

// 不要在事件名中包含实例ID，监听方不应该需要知道实例ID才能收到事件
// 事件名就是事件类型

// 全局事件脚本可以挂在任何实例上，如果要操作所挂的实例，需要检查 currentTarget 的类型、状态和接口是否支持
// 挂载行为不会产生事件，时机也不重要，不关心挂载对象的生命周期，甚至可以集中放在顶层，留个配对记录即可
// 如果需要操作某个实例，就挂到该实例上，如果需要操作很多实例，就挂到这些实例的parent上

/**
 * 经典场景：
 *
 * ### 全局事件
 *
 * - 一个 Layer 想要根据场景变化来触发内部行为
 * 		- 实现上似乎可以写在Layer内？因为该脚本只适用于一种Layer。
 * 		- 但是Layer是不知道 scene ID 的
 * 		- 需要Layer实现 changeScene 接口或内部事件，然后在全局事件脚本中调用
 * 		- 相当于脚本是在扩展 PolarisApp 的功能，而非 Layer。是在做编排，而非功能。
 *
 * - 一个 Layer 想要根据 其他 Layer 的行为来触发内部行为
 * 		- EventBus 的典型用例：结偶组件之间的通讯与联动
 *
 * - 场景切换时想做相机动画
 * 		- 在任意实例上监听 beforeSceneChange 事件，修改 duration 和 skipCamera 即可
 * 		- 也可以 AfterSceneChange 后接管相机，做路径动画
 *
 * - 场景切换时想要做一些相机和Layer之外的特殊行为
 * 		- 例如：修改Polaris配置、渲染器配置、灯光配置
 *
 * - 超出“场景”概念的控制能力
 * 		- 例如：场景多到不可枚举，或者layer列表是动态的，只能用自定义事件来控制
 *
 * - 数据变化时的行为
 * 		- 例如：用 updateData 切换场景
 * 		- 例如：对收到的数据做二次加工
 *
 * - 额外的附加功能
 * 		- 例如：性能和错误监控
 * 		- 例如：自动降帧
 * 		- 例如：场景轮播
 * 		- 例如：额外的内存清理
 *
 * ### Layer 事件
 *
 * - 不改Layer的情况下，修改Layer行为
 * - 不写新Layer的情况下，用空Layer实现新的效果
 * - 特定Layer的数据过滤器
 */
