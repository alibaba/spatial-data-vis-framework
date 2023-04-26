import type { PolarisThreeProps } from '@polaris.gl/three'

import type { LayerClassesShape } from './meta'

// L0

export type AppConfig<TLayerClasses extends LayerClassesShape = any> = {
	/**
	 * Polaris Config Schema Version
	 */
	version: '0.0.1'

	app: AppPolarisConfig

	layers: LayersConfig<TLayerClasses>
	stages: StagesConfig
	scenes: ScenesConfig

	dataStubs?: DataStubsConfig

	/**
	 * @experimental
	 * 编辑器存储的UI状态
	 * @note 不影响运行时行为
	 */
	$editor?: any
}

// L1

/**
 * Basic App Config (Supported Polaris Props)
 */
export type AppPolarisConfig = Pick<
	PolarisThreeProps,
	| 'width'
	| 'height'
	| 'antialias'
	| 'fov'
	| 'background'
	| 'autoResize'
	| 'enablePointer'
	| 'asyncRendering'
	| 'pitchLimit'
	| 'zoomLimit'
	| 'lights'
	| 'debug'
> & {
	/**
	 * 启动时默认进入的场景
	 */
	initialScene?: string
}

export type LayersConfig<TLayerClasses extends LayerClassesShape> = LayerConfig<TLayerClasses>[]

export type StagesConfig = StageConfig[]

export type ScenesConfig = SceneConfig[]

export type DataStubsConfig = DataStub[]

// L2

export type LayerConfig<
	TLayerClasses extends LayerClassesShape = any,
	TLayerClassName extends keyof TLayerClasses = any
> = {
	name: string
	id: string
	class: TLayerClassName
	props: TLayerClasses[TLayerClassName]['propsDescription']
	dataProps?: { [name: string]: string }
}

export type StageConfig = {
	name: string
	id: string
	layers: string[]
	projection?: string
}

export type SceneConfig = {
	name: string
	id: string
	stage: string
	cameraStateCode: string
	layers: string[]
}

/**
 * Data Stub (data source)
 * @experimental
 */
export type DataStub = {
	id: string
	name: string
	initialValue?: any

	// @todo 是否是多余的？实际是mutable控制，如果mutable就直接更新，不mutable就重建
	// 这里更像是个提示，提示的是 App 的最终用户（调用 updateData 的人）
	// mutable 则是提示 Editor
	// @todo 这里有个问题：
	// - mutable 如果只是用于提示 editor，那么编写的 Layer 就只能在 Editor 中安全运行
	// - 如果 PropsDescription 不是Layer接口的一部分，那 Layer 接口里面是否需要明确提出 那些 props mutable？
	// - 这似乎是个 Polaris Layer 接口的设计问题，可以先不在这里考虑
	dynamic?: boolean
}
