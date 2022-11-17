import { ConfigEvents, getEventOrder } from './ConfigManager'
import type { EventDispatcher } from './EventDispatcher'
import type { AppConfig, LayerClassesShape } from './schema'

/**
 * 监听局部更新事件，维护全量配置
 * @todo 同步报错会破坏事件系统的优势
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
}

/**
 *  compare new config with the old one, dispatch events to update the old one
 */
export function updateFullConfig<TLayerClasses extends LayerClassesShape = any>(
	dispatcher: EventDispatcher<ConfigEvents<TLayerClasses>>,
	curr: AppConfig<TLayerClasses>,
	next: AppConfig<TLayerClasses>
) {
	// 如果事件系统是同步的，派发事件会导致 curr 被修改，影响后续事件
	// 因此要在最后集中派发事件
	const batch = new EventBatch(dispatcher)

	// app
	if (!deepEqual(curr.app, next.app)) {
		batch.dispatchEvent({
			type: 'app:change',
			data: next.app,
		})
	}

	// layers
	const currLayerIds = curr.layers.map((layer) => layer.id)
	const nextLayerIds = next.layers.map((layer) => layer.id)

	// remove layers
	for (const currLayerId of currLayerIds) {
		if (!nextLayerIds.includes(currLayerId)) {
			batch.dispatchEvent({
				// ⚠️注意这里会修改curr数据
				type: 'layer:remove',
				data: {
					id: currLayerId,
				},
			})
		}
	}

	// add layers
	for (const nextLayer of next.layers) {
		if (!currLayerIds.includes(nextLayer.id)) {
			batch.dispatchEvent({
				type: 'layer:add',
				data: nextLayer,
			})
		}
	}

	// update layers
	for (const nextLayer of next.layers) {
		const currLayer = curr.layers.find((layer) => layer.id === nextLayer.id)

		if (!currLayer) continue

		// name
		if (currLayer.name !== nextLayer.name) {
			batch.dispatchEvent({
				type: 'layer:change:name',
				data: {
					id: nextLayer.id,
					name: nextLayer.name,
				},
			})
		}

		// props
		if (!deepEqual(currLayer.props, nextLayer.props)) {
			batch.dispatchEvent({
				type: 'layer:change:props',
				data: {
					id: nextLayer.id,
					props: nextLayer.props,
				},
			})
		}
	}

	// stages
	const currStageIds = curr.stages.map((stage) => stage.id)
	const nextStageIds = next.stages.map((stage) => stage.id)

	// remove stages
	for (const currStageId of currStageIds) {
		if (!nextStageIds.includes(currStageId)) {
			batch.dispatchEvent({
				type: 'stage:remove',
				data: {
					id: currStageId,
				},
			})
		}
	}

	// add stages
	for (const nextStage of next.stages) {
		if (!currStageIds.includes(nextStage.id)) {
			batch.dispatchEvent({
				type: 'stage:add',
				data: nextStage,
			})
		}
	}

	// update stages
	for (const nextStage of next.stages) {
		const currStage = curr.stages.find((stage) => stage.id === nextStage.id)

		if (!currStage) continue

		// name
		if (currStage.name !== nextStage.name) {
			batch.dispatchEvent({
				type: 'stage:change:name',
				data: {
					id: nextStage.id,
					name: nextStage.name,
				},
			})
		}

		// layers
		if (!idsEqual(currStage.layers, nextStage.layers)) {
			batch.dispatchEvent({
				type: 'stage:change:layers',
				data: {
					id: nextStage.id,
					layers: nextStage.layers,
				},
			})
		}

		// projection
		if (currStage.projection !== nextStage.projection) {
			batch.dispatchEvent({
				type: 'stage:change:projection',
				data: {
					id: nextStage.id,
					projection: nextStage.projection,
				},
			})
		}
	}

	// scenes
	const currSceneIds = curr.scenes.map((scene) => scene.id)
	const nextSceneIds = next.scenes.map((scene) => scene.id)

	// remove scenes
	for (const currSceneId of currSceneIds) {
		if (!nextSceneIds.includes(currSceneId)) {
			batch.dispatchEvent({
				type: 'scene:remove',
				data: {
					id: currSceneId,
				},
			})
		}
	}

	// add scenes
	for (const nextScene of next.scenes) {
		if (!currSceneIds.includes(nextScene.id)) {
			batch.dispatchEvent({
				type: 'scene:add',
				data: nextScene,
			})
		}
	}

	// update scenes
	for (const nextScene of next.scenes) {
		const currScene = curr.scenes.find((scene) => scene.id === nextScene.id)

		if (!currScene) continue

		// name
		if (currScene.name !== nextScene.name) {
			batch.dispatchEvent({
				type: 'scene:change:name',
				data: {
					id: nextScene.id,
					name: nextScene.name,
				},
			})
		}

		if (currScene.stage !== nextScene.stage) {
			batch.dispatchEvent({
				type: 'scene:change:stage',
				data: {
					id: nextScene.id,
					stage: nextScene.stage,
				},
			})
		}

		// layers
		if (!idsEqual(currScene.layers, nextScene.layers)) {
			batch.dispatchEvent({
				type: 'scene:change:layers',
				data: {
					id: nextScene.id,
					layers: nextScene.layers,
				},
			})
		}

		// cameraStateCode
		if (currScene.cameraStateCode !== nextScene.cameraStateCode) {
			batch.dispatchEvent({
				type: 'scene:change:cameraStateCode',
				data: {
					id: nextScene.id,
					cameraStateCode: nextScene.cameraStateCode,
				},
			})
		}
	}

	// 按照依赖顺序触发事件

	batch.events.sort((a, b) => getEventOrder(a.type) - getEventOrder(b.type))

	// these events will trigger `registerConfigSync`, curr will be updated after that
	batch.flush()
}

/**
 * deep compare two objects/arrays
 */

function deepEqual(a: any, b: any): boolean {
	if (a === b) return true

	if (typeof a !== typeof b) return false

	if (typeof a !== 'object') return false

	if (a === null || b === null) return false

	if (Array.isArray(a) !== Array.isArray(b)) return false

	if (Array.isArray(a)) {
		if (a.length !== b.length) return false

		if (a.length > 10_000)
			console.warn('deepEqual: array length > 10_000, performance may be degraded')

		for (let i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) return false
		}

		return true
	}

	const aKeys = Object.keys(a)
	const bKeys = Object.keys(b)

	if (aKeys.length !== bKeys.length) return false

	for (const key of aKeys) {
		if (!bKeys.includes(key)) return false

		if (!deepEqual(a[key], b[key])) return false
	}

	return true
}

/**
 * compare two id arrays
 */
function idsEqual(a: string[], b: string[]): boolean {
	if (a === b) return true

	if (a.length !== b.length) return false

	const setB = new Set(b)

	for (const item of a) {
		if (!setB.has(item)) return false
	}

	return true
}

class EventBatch<TDispatcher extends EventDispatcher> {
	private readonly dispatcher: TDispatcher

	readonly events: any[] = []

	dispatchEvent: TDispatcher['dispatchEvent']

	constructor(dispatcher: TDispatcher) {
		this.dispatcher = dispatcher

		this.dispatchEvent = (e) => this.events.push(e)
	}

	public flush(): void {
		for (const event of this.events) {
			this.dispatcher.dispatchEvent(event)
		}
	}
}
