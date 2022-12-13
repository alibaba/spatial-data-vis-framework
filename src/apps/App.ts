/**
 * @file PolarisApp
 * @description
 * Polaris App 的标注应用
 * @note
 * 不要修改该类，如果要增加自定义接口或参数，再该文件夹中创建一个新的类，继承或包裹该标准应用
 */
import type { StandardLayer } from '@polaris.gl/gsi'
import { createFromDesc } from '@polaris.gl/projection'

import { LayerClasses } from '../layers'
import { AppBase } from '../private/base/AppBase'
import { SceneBase } from '../private/base/SceneBase'
import { StageBase } from '../private/base/StageBase'
import { ConfigManager } from '../private/config/ConfigManager'
import type { AppConfig } from '../private/config/schema'
import type { LayerClassesShape } from '../private/schema/meta'
import { occupyID } from '../private/utils/unique'

const SCOPE_KEY = Symbol('scopeKey')

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
	readonly configManager = new ConfigManager<typeof LayerClasses>()
	readonly layers = [] as { layer: StandardLayer; name: string; id: string }[]

	private readonly [SCOPE_KEY] = {}

	constructor(container: HTMLDivElement, config: AppConfig<typeof LayerClasses>) {
		const scope = {} // 用于检查是否有重复的 ID
		// create layers
		const layers = config.layers.map((layer) => {
			// 如果 有 dataProps 而且对应的 dataStub 有初始值，则创建的时候直接带上初始值

			const initialProps = { ...layer.props }

			if (layer.dataProps) {
				Object.entries(layer.dataProps).forEach(([propKey, dataStubID]) => {
					const dataStub = config.dataStubs?.find((stub) => stub.id === dataStubID)

					if (!dataStub)
						throw new Error(`dataStub (${dataStubID}) required by layer (${layer.id}) not found.`)

					if (initialProps[propKey] !== undefined)
						throw new Error(`prop and dataProp can't have the same key (${propKey}).`)

					if (dataStub.initialValue !== undefined) {
						initialProps[propKey] = dataStub.initialValue
					}
				})
			}

			return {
				layer: createLayer(LayerClasses, layer.class, initialProps),
				name: layer.name,
				id: occupyID(scope, layer.id),
			}
		})

		// create stages (layer containers)
		const stages = config.stages.map((stage) => {
			return new StageBase({
				projection: stage.projection ? createFromDesc(stage.projection) : undefined,
				layers: layers.filter((l) => stage.layers.includes('*') || stage.layers.includes(l.id)),
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

		this[SCOPE_KEY] = scope

		this.layers = layers

		this.configManager.init(config)

		this.watchConfig()
	}

	/**
	 * listen to config change
	 */
	private watchConfig() {
		const m = this.configManager
		m.addEventListener('app:change', (e) => {
			this.polaris.setProps(e.data)
		})

		m.addEventListener('layer:add', (e) => {
			const layer = createLayer(LayerClasses, e.data.class, e.data.props)
			this.layers.push({ layer, name: e.data.name, id: occupyID(this[SCOPE_KEY], e.data.id) })
			this.updateLayerFilters()
		})

		m.addEventListener('layer:remove', (e) => {
			const index = this.layers.findIndex((l) => l.id === e.data.id)
			if (index >= 0) {
				const layer = this.layers[index].layer
				if (layer.parent) layer.parent.remove(layer)
				layer.dispose()
				this.layers.splice(index, 1)
			}
			this.updateLayerFilters()
		})

		m.addEventListener('layer:change:name', (e) => {
			const layer = this.layers.find((l) => l.id === e.data.id)
			if (layer) layer.name = e.data.name
		})

		m.addEventListener('layer:change:props', (e) => {
			const layer = this.layers.find((l) => l.id === e.data.id)
			if (layer) layer.layer.setProps(e.data.props)
		})

		m.addEventListener('stage:add', (e) => {
			throw new Error('not implemented')
			// const stage = new StageBase({
			// 	projection: e.data.projection ? createFromDesc(e.data.projection) : undefined,
			// 	layers: this.layers.filter((l) => e.data.layers.includes(l.id)),
			// 	name: e.data.name,
			// 	id: e.data.id,
			// })

			// this.stages.push(stage)
		})

		m.addEventListener('stage:remove', (e) => {
			throw new Error('not implemented')
			// const index = this.stages.findIndex((s) => s.id === e.data.id)
			// if (index >= 0) {
			// 	const stage = this.stages[index]
			// 	stage.dispose()
			// 	this.stages.splice(index, 1)
			// }
		})

		m.addEventListener('stage:change:name', (e) => {
			const stage = this.stages.find((s) => s.id === e.data.id)
			if (stage) stage.name = e.data.name
		})

		m.addEventListener('stage:change:projection', (e) => {
			throw new Error('not implemented')
		})

		m.addEventListener('stage:change:layers', (e) => {
			this.updateLayerFilters()
		})

		m.addEventListener('scene:add', (e) => {
			const scene = new SceneBase()
			scene.id = e.data.id
			scene.name = e.data.name
			scene.cameraStateCode = e.data.cameraStateCode
			scene.layers = e.data.layers ?? ['*']

			this.scenes.push(scene)
		})

		m.addEventListener('scene:remove', (e) => {
			if (e.data.id === 'LOCAL_SCENE_DEFAULT') {
				throw new Error('cannot remove default scene')
			}

			const index = this.scenes.findIndex((s) => s.id === e.data.id)
			if (index >= 0) {
				// const scene = this.scenes[index]
				this.scenes.splice(index, 1)
			}
		})

		m.addEventListener('scene:change:name', (e) => {
			const scene = this.scenes.find((s) => s.id === e.data.id)
			if (scene) scene.name = e.data.name
		})

		m.addEventListener('scene:change:cameraStateCode', (e) => {
			const scene = this.scenes.find((s) => s.id === e.data.id)
			if (!scene) throw new Error('scene not found')

			scene.cameraStateCode = e.data.cameraStateCode

			// 如果处于这个scene，则立即生效
			if (this.currentSceneID === scene.id) {
				this.changeScene(scene.id)
			}
		})

		m.addEventListener('scene:change:layers', (e) => {
			const scene = this.scenes.find((s) => s.id === e.data.id)

			if (!scene) throw new Error('scene not found')

			scene.layers = e.data.layers

			// 如果处于这个scene，则立即生效
			if (this.currentSceneID === scene.id) {
				this.changeScene(scene.id)
			}
		})
	}

	/**
	 * re-filter layers in stages and scenes
	 */
	private updateLayerFilters() {
		const config = this.configManager.getConfig()
		for (const stage of this.stages) {
			const stageConfig = config.stages.find((s) => s.id === stage.id)

			if (!stageConfig) throw new Error('stage exist but not found in config')

			const currLayers = stage.layers
			const nextLayers = this.layers.filter(
				(l) => stageConfig.layers.includes('*') || stageConfig.layers.includes(l.id)
			)

			// find added and removed layers
			const addedLayers = nextLayers.filter((l) => !currLayers.includes(l))
			const removedLayers = currLayers.filter((l) => !nextLayers.includes(l))

			for (const layer of removedLayers) {
				stage.remove(layer.layer)
			}

			for (const layer of addedLayers) {
				stage.add(layer.layer)
			}
		}
	}

	/**
	 * 更新一个 data stub 的 value
	 * @experimental
	 */
	updateDataStub(id: string, value: any) {
		const config = this.configManager.getConfig()
		const stub = config.dataStubs?.find((s) => s.id === id)

		if (!stub) throw new Error(`data stub (id: ${id}) not found.`)

		// @todo dynamic limit

		// @todo @perf cache this
		const affectedLayers = config.layers.filter(
			(l) => l.dataProps && Object.values(l.dataProps).includes(id)
		)

		for (const layerConfig of affectedLayers) {
			// @note 直接调用 setProps，config 是静态的，data updating should not touch config

			const layerInstance = this.layers.find((l) => l.id === layerConfig.id)

			if (!layerInstance) throw new Error(`layer (id: ${layerConfig.id}) not found.`)

			const affectedProps = {}
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			Object.entries(layerConfig.dataProps!).forEach(([propKey, dataStubID]) => {
				if (dataStubID === id) {
					affectedProps[propKey] = value
				}
			})

			// @todo check mutability (rebuild layer if not mutable)
			layerInstance.layer.setProps(affectedProps)
		}
	}

	// global stats
	static {}

	static $getMeta() {
		return {
			layers: { ...LayerClasses },
		}
	}
}

/**
 * Create a layer instance by class name and constructor props
 */
function createLayer<
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
