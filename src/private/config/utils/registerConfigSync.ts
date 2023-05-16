import type { AppConfig } from '../../schema/config'
import type { LayerClassesShape } from '../../schema/meta'
import type { ConfigEvents } from '../ConfigManager'
import type { EventDispatcher } from '../EventDispatcher'

/**
 * @outdated
 * @to_be_deleted
 *
 * 监听局部更新事件，维护全量配置
 * @deprecated use ../actions instead
 * @bug 外部 target 如果变化，这个函数就会失效
 * 似乎可以完全用action，不用这种原地更新的方案
 */
export function registerConfigSync<TLayerClasses extends LayerClassesShape = any>(
	dispatcher: EventDispatcher<ConfigEvents<TLayerClasses>>,
	target: AppConfig<TLayerClasses>
) {
	dispatcher.addEventListener('app:change', (e) => {
		target.app = e.data
	})

	dispatcher.addEventListener('layer:add', (e) => {
		if (target.layers.some((layer) => layer.id === e.data.id))
			throw new Error(`Layer id ${e.data.id} already exists`)

		target.layers.push(e.data)
	})

	dispatcher.addEventListener('layer:remove', (e) => {
		const index = target.layers.findIndex((layer) => layer.id === e.data.id)

		if (index === -1) throw new Error(`Layer id ${e.data.id} not found`)

		target.layers.splice(index, 1)
	})

	dispatcher.addEventListener('layer:change:name', (e) => {
		const layer = target.layers.find((layer) => layer.id === e.data.id)

		if (!layer) throw new Error(`Layer id ${e.data.id} not found`)

		layer.name = e.data.name
	})

	dispatcher.addEventListener('layer:change:props', (e) => {
		const layer = target.layers.find((layer) => layer.id === e.data.id)

		if (!layer) throw new Error(`Layer id ${e.data.id} not found`)

		layer.props = e.data.props
	})

	dispatcher.addEventListener('layer:change:dataProps', (e) => {
		const layer = target.layers.find((layer) => layer.id === e.data.id)

		if (!layer) throw new Error(`Layer id ${e.data.id} not found`)

		layer.dataProps = e.data.dataProps
	})

	dispatcher.addEventListener('stage:add', (e) => {
		if (target.stages.some((stage) => stage.id === e.data.id))
			throw new Error(`Stage id ${e.data.id} already exists`)

		target.stages.push(e.data)
	})

	dispatcher.addEventListener('stage:remove', (e) => {
		const index = target.stages.findIndex((stage) => stage.id === e.data.id)

		if (index === -1) throw new Error(`Stage id ${e.data.id} not found`)

		target.stages.splice(index, 1)
	})

	dispatcher.addEventListener('stage:change:name', (e) => {
		const stage = target.stages.find((stage) => stage.id === e.data.id)

		if (!stage) {
			throw new Error(`Stage id ${e.data.id} not found`)
		}

		stage.name = e.data.name
	})

	dispatcher.addEventListener('stage:change:layers', (e) => {
		const stage = target.stages.find((stage) => stage.id === e.data.id)

		if (!stage) throw new Error(`Stage id ${e.data.id} not found`)

		stage.layers = e.data.layers
	})

	dispatcher.addEventListener('stage:change:projection', (e) => {
		const stage = target.stages.find((stage) => stage.id === e.data.id)

		if (!stage) throw new Error(`Stage id ${e.data.id} not found`)

		stage.projection = e.data.projection
	})

	dispatcher.addEventListener('scene:add', (e) => {
		if (target.scenes.some((scene) => scene.id === e.data.id))
			throw new Error(`Scene id ${e.data.id} already exists`)

		target.scenes.push(e.data)
	})

	dispatcher.addEventListener('scene:remove', (e) => {
		const index = target.scenes.findIndex((scene) => scene.id === e.data.id)

		if (index === -1) throw new Error(`Scene id ${e.data.id} not found`)

		target.scenes.splice(index, 1)
	})

	dispatcher.addEventListener('scene:change:name', (e) => {
		const scene = target.scenes.find((scene) => scene.id === e.data.id)

		if (!scene) throw new Error(`Scene id ${e.data.id} not found`)

		scene.name = e.data.name
	})

	dispatcher.addEventListener('scene:change:layers', (e) => {
		const scene = target.scenes.find((scene) => scene.id === e.data.id)

		if (!scene) throw new Error(`Scene id ${e.data.id} not found`)

		scene.layers = e.data.layers
	})

	dispatcher.addEventListener('scene:change:stage', (e) => {
		const scene = target.scenes.find((scene) => scene.id === e.data.id)

		if (!scene) throw new Error(`Scene id ${e.data.id} not found`)

		scene.stage = e.data.stage
	})

	dispatcher.addEventListener('scene:change:cameraStateCode', (e) => {
		const scene = target.scenes.find((scene) => scene.id === e.data.id)

		if (!scene) throw new Error(`Scene id ${e.data.id} not found`)

		scene.cameraStateCode = e.data.cameraStateCode
	})

	dispatcher.addEventListener('data:add', (e) => {
		if (!target.dataStubs) {
			target.dataStubs = [e.data]
		} else if (target.dataStubs.some((stub) => stub.id === e.data.id)) {
			throw new Error(`DataStub id ${e.data.id} already exists`)
		} else {
			target.dataStubs.push(e.data)
		}
	})

	dispatcher.addEventListener('data:remove', (e) => {
		if (!target.dataStubs) {
			throw new Error(`DataStub id ${e.data.id} not found`)
		} else {
			const index = target.dataStubs.findIndex((stub) => stub.id === e.data.id)

			if (index === -1) throw new Error(`DataStub id ${e.data.id} not found`)

			target.dataStubs.splice(index, 1)
		}
	})

	dispatcher.addEventListener('data:change:name', (e) => {
		if (!target.dataStubs) {
			throw new Error(`DataStub id ${e.data.id} not found`)
		} else {
			const stub = target.dataStubs.find((stub) => stub.id === e.data.id)

			if (!stub) throw new Error(`DataStub id ${e.data.id} not found`)

			stub.name = e.data.name
		}
	})

	dispatcher.addEventListener('data:change:initialValue', (e) => {
		if (!target.dataStubs) {
			throw new Error(`DataStub id ${e.data.id} not found`)
		} else {
			const stub = target.dataStubs.find((stub) => stub.id === e.data.id)

			if (!stub) throw new Error(`DataStub id ${e.data.id} not found`)

			stub.initialValue = e.data.initialValue
		}
	})
}
