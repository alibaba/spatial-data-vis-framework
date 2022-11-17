import { PropsManager } from '@polaris.gl/props-manager'

import { getLayerConfig, getSceneConfig, getStageConfig } from '../utils/config'
import { EventDispatcher } from './EventDispatcher'
import type {
	AppConfig,
	AppPolarisConfig,
	LayerClassesShape,
	LayerConfig,
	PropDescription,
	SceneConfig,
	StageConfig,
} from './schema'
import { registerConfigSync, updateFullConfig } from './utils'

const CURR_KEY = Symbol('CurrConfigKey')

/**
 * Polaris App Config Manager. Reacting to config changes.
 * RPC friendly.
 *
 * @config_flow
 *
 *         ｜<---------------------------------|
 * UI:   editor(view) --> event(action) --> config(model)
 *                                             ↓ <sync>
 * APP: polaris(view) <-- event(action) <-- config(model)
 *
 * @feature
 * - 通过局部更新配置，维护全量配置
 * - RPC 增量或全量同步
 *
 * @non_feature
 * - 不支持merge更新，操作的所有数据都是对应区域的全量数据，直接替换
 *
 * @todo
 * - ? 是否支持全量更新配置，通过藏检查触发局部更新事件 ?
 * 		- 进程内直接用事件系统更方便
 * 		- RPC 时，序列化/反序列化之后，引用全部变化，只能通过深对比来判断更新单元是否变化
 * - ? 是否需要维护class检查和props检查？还是由外部控制 ？
 * - ? 是否需要最小更新单元 ?
 * 	- ❌ 不需要这个概念，action接口自然体现了最小更新单元
 * 	- config.app // AppPolarisConfig
 * 	- config.layers[n].props // props object
 * 	- config.stages[n].layers // array<string>
 * 	- config.scenes[n].layers // array<string>
 *
 * @reason
 * - 符合单向数据流范式
 * - editor 理应知道修改的具体部分
 * - editor 的config管理需要使用hooks机制，而 Polaris 则使用event机制，manager需要沟通两者
 */
export class ConfigManager<TLayerClasses extends LayerClassesShape> extends EventDispatcher<
	ConfigEvents<TLayerClasses>
> {
	private readonly [CURR_KEY]: AppConfig<TLayerClasses> = {
		version: '0.0.1',
		app: {},
		layers: [],
		stages: [],
		scenes: [],
	}

	constructor(initialConfig?: AppConfig<TLayerClasses>) {
		super()

		if (initialConfig) this.init(initialConfig)

		const curr = this[CURR_KEY]
		registerConfigSync(this, curr)
	}

	/**
	 * set config without trigger change event or dirt-check
	 */
	init(config: AppConfig<TLayerClasses>) {
		const curr = this[CURR_KEY]
		curr.app = config.app
		curr.layers = config.layers
		curr.scenes = config.scenes
		curr.stages = config.stages

		this.dispatchEvent({ type: 'init', data: { ...curr } })
	}

	getConfig() {
		return { ...this[CURR_KEY] }
	}

	setConfig(next: AppConfig<TLayerClasses>) {
		const curr = this[CURR_KEY]
		updateFullConfig(this, curr, next)
	}
}

type MapType<T extends Record<string, any>> = {
	[K in keyof T]: { type: K; data: T[K]; source?: any }
}

/**
 * 从studio触发这些事件，在App内部相应这些事件，修改场景。
 */
export type ConfigEvents<TLayerClasses extends LayerClassesShape = any> = MapType<{
	init: AppConfig<TLayerClasses>

	// change: {} // any kind of change (except for init)

	'app:change': AppPolarisConfig

	'layer:add': LayerConfig<TLayerClasses>
	'layer:remove': { id: string }
	'layer:change:name': { id: string; name: string }
	// 在callback中对比详细，如果 mutable，就调用layer.setProps，否则就重建layer
	'layer:change:props': { id: string; props: any }

	'scene:add': SceneConfig
	'scene:remove': { id: string }
	'scene:change:name': { id: string; name: string }
	'scene:change:stage': { id: string; stage: string }
	'scene:change:layers': { id: string; layers: string[] }
	'scene:change:cameraStateCode': { id: string; cameraStateCode: string }

	'stage:add': StageConfig
	'stage:remove': { id: string }
	'stage:change:name': { id: string; name: string }
	'stage:change:layers': { id: string; layers: string[] }
	'stage:change:projection': { id: string; projection: string | undefined }
}>

/**
 * 执行顺序，不设定则为0，从小到大执行
 * - 内存效率
 * 	- 先删除，后处理修改，最后添加
 * - 依赖关系
 * 	- 添加时，自底向上
 * 	- 删除时，自顶向下
 */
export function getEventOrder(name: keyof ConfigEvents): number {
	switch (name) {
		// pre
		case 'scene:remove':
			return -5
		case 'stage:remove':
			return -4
		case 'layer:remove':
			return -3

		// post
		case 'layer:add':
			return 3
		case 'stage:add':
			return 4
		case 'scene:add':
			return 5

		default:
			return 0
	}
}
