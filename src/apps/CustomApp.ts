/**
 * 业务类，包含专用的配置项和接口
 */

import { App } from './App'
import { BPConfig } from '../config/template'
import type { WidgetConfig, RuntimeWidgetLayer } from '../layers/RuntimeWidgetLayer'
import { getLayerConfig, getStageConfig, getSceneConfig } from '../private/utils/config'

/**
 * custom config
 */
export type Config = {
	width: number
	height: number
	modelURL: string
}

export class CustomApp extends App {
	constructor(container: HTMLDivElement, config: Config) {
		BPConfig.app.width = config.width
		BPConfig.app.height = config.height
		const modelLayerConfig = getLayerConfig(BPConfig, 'LOCAL_LAYER_1')
		modelLayerConfig.props.glb = config.modelURL

		const stageConfig = getStageConfig(BPConfig, 'LOCAL_STAGE_MAIN')
		stageConfig.layers = []

		const sceneConfig = getSceneConfig(BPConfig, 'LOCAL_SCENE_DEFAULT')
		sceneConfig.layers = []

		super(container, BPConfig)
	}

	// custom methods...
	addRuntimeWidget(element: HTMLDivElement, config: WidgetConfig) {
		const runtimeWidgetLayer = this.mainStage.getLayer('LOCAL_LAYER_3').layer as RuntimeWidgetLayer
		if (!runtimeWidgetLayer) throw new Error(`Cannot find runtime widget layer`)

		runtimeWidgetLayer.addWidget(element, config)
	}
	removeRuntimeWidget(id: number) {
		const runtimeWidgetLayer = this.mainStage.getLayer('LOCAL_LAYER_3').layer as RuntimeWidgetLayer
		if (!runtimeWidgetLayer) throw new Error(`Cannot find runtime widget layer`)
	}
}
