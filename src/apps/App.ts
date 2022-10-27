/**
 * @file PolarisApp
 * @description
 * Polaris App 的标注应用
 * @note
 * 不要修改该类，如果要增加自定义接口或参数，再该文件夹中创建一个新的类，继承或包裹该标准应用
 */

import { Projection } from '@polaris.gl/projection'

import { AppBase, AppBaseConfig } from '../private/base/AppBase'
import { StageBase } from '../private/base/StageBase'
import { SceneBase } from '../private/base/SceneBase'
import { occupyID } from '../private/utils/unique'
import { LAYERS, LayerClassName, createLayer } from '../layers'

/**
 * Entry Class. 入口应用
 *
 * @usage
 * ```typescript
 * import { App } from './app.mjs'
 *
 * const container = document.getElementById('container')
 * const DefaultConfig = await (await fetch('./config.json')).json()
 *
 * const polarisApp = new App(container, DefaultConfig)
 * ```
 *
 * @todo 在这里可以把类型静态化
 */
export class App extends AppBase {
	constructor(container: HTMLDivElement, config: AppConfig) {
		// create layers
		const layers = config.layers.map((layer) => ({
			layer: createLayer(layer.class, layer.props),
			name: layer.name,
			id: occupyID(layer.id),
		}))

		// create stages (layer containers)
		const stages = config.stages.map((stage) => {
			return new StageBase({
				projection: stage.projection,
				layers: layers.filter((l) => stage.layers.includes(l.id)),
				name: stage.name,
				id: stage.id,
			})
		})

		// create scenes (layer filters and camera states)
		const scenes = config.scenes.map((scene) => {
			const s = new SceneBase()
			s.id = occupyID(scene.id)
			s.name = scene.name
			s.cameraStateCode = scene.cameraStateCode
			s.layers = scene.layers ?? ['*']

			return s
		})

		//
		super(container, config, stages, scenes)
	}
}

/**
 * AppConfig Schema Definition
 */
export type AppConfig = AppBaseConfig & {
	layers: LayersConfig
	stages: StagesConfig
	scenes: ScenesConfig
}

type LayerConfig<T extends LayerClassName> = {
	name: string
	id: string
	class: T
	props: any // typeof LAYERS[T]['propsDescription']
}

type LayersConfig = readonly LayerConfig<LayerClassName>[]

type StageConfig = {
	name: string
	id: string
	layers: string[]
	projection?: Projection
}

type StagesConfig = StageConfig[]

type SceneConfig = {
	name: string
	id: string
	stage: string
	cameraStateCode: string
	layers: string[]
	projection?: Projection
}

type ScenesConfig = SceneConfig[]

export type CustomConfig = {}
