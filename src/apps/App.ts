/**
 * @file PolarisApp
 * @description
 * Polaris App 的标注应用
 * @note
 * 不要修改该类，如果要增加自定义接口或参数，再该文件夹中创建一个新的类，继承或包裹该标准应用
 */
import { createFromDesc } from '@polaris.gl/projection'

import { LayerClasses } from '../layers'
import { AppBase } from '../private/base/AppBase'
import { SceneBase } from '../private/base/SceneBase'
import { StageBase } from '../private/base/StageBase'
import type { AppConfig, LayerClassesShape } from '../private/config/schema'
import { occupyID } from '../private/utils/unique'

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
	declare config: AppConfig<typeof LayerClasses>

	constructor(container: HTMLDivElement, config: AppConfig<typeof LayerClasses>) {
		const scope = {} // 用于检查是否有重复的 ID
		// create layers
		const layers = config.layers.map((layer) => ({
			layer: createLayer(LayerClasses, layer.class, layer.props),
			name: layer.name,
			id: occupyID(scope, layer.id),
		}))

		// create stages (layer containers)
		const stages = config.stages.map((stage) => {
			return new StageBase({
				projection: stage.projection ? createFromDesc(stage.projection) : undefined,
				layers: layers.filter((l) => stage.layers.includes(l.id)),
				name: stage.name,
				id: stage.id,
			})
		})

		// create scenes (layer filters and camera states)
		const scenes = config.scenes.map((scene) => {
			const s = new SceneBase()
			s.id = occupyID(scope, scene.id)
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
 * Create a layer instance by class name and constructor props
 */
export function createLayer<
	TLayerClasses extends LayerClassesShape,
	TClassName extends keyof TLayerClasses
>(
	classes: TLayerClasses,
	className: TClassName,
	props: Parameters<TLayerClasses[TClassName]['factory']>[0]
): ReturnType<TLayerClasses[TClassName]['factory']> {
	const factory = classes[className]?.factory as TLayerClasses[TClassName]['factory']
	if (!factory) throw new Error(`Cannot find layer type: ${name}.`)

	return factory(props as any) as ReturnType<TLayerClasses[TClassName]['factory']>
}
