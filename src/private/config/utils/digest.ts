import type { AppConfig } from '../../schema/config'
import type { LayerClassesShape } from '../../schema/meta'
import type { ConfigEvents } from '../ConfigManager'
import type { EventDispatcher } from '../EventDispatcher'
import { deepEqual, idsEqual, propsDiff, propsEqual, scriptTargetsEqual } from './compare'

/**
 * compare new config with the old one, dispatch events to update the old one
 * @note deep-compare `config.app`
 * @note shallow-compare first level of `config.layer.props`
 */
export function digest<TLayerClasses extends LayerClassesShape = any>(
	dispatcher: EventDispatcher<ConfigEvents<TLayerClasses>>,
	prev: AppConfig<TLayerClasses>,
	next: AppConfig<TLayerClasses>
) {
	const batch = new EventBatch(dispatcher)

	// app
	if (!deepEqual(prev.app, next.app)) {
		batch.dispatchEvent({
			type: 'app:change',
			data: next.app,
		})
	}

	// layers
	const prevLayerIds = prev.layers.map((layer) => layer.id)
	const nextLayerIds = next.layers.map((layer) => layer.id)

	// remove layers
	for (const prevLayerId of prevLayerIds) {
		if (!nextLayerIds.includes(prevLayerId)) {
			batch.dispatchEvent({
				type: 'layer:remove',
				data: {
					id: prevLayerId,
				},
			})
		}
	}

	// add layers
	for (const nextLayer of next.layers) {
		if (!prevLayerIds.includes(nextLayer.id)) {
			batch.dispatchEvent({
				type: 'layer:add',
				data: nextLayer,
			})
		}
	}

	// update layers
	for (const nextLayer of next.layers) {
		const prevLayer = prev.layers.find((layer) => layer.id === nextLayer.id)

		if (!prevLayer) continue

		// class
		if (prevLayer.class !== nextLayer.class) {
			throw new Error(`Layer (${nextLayer.id}) class cannot be changed. Use a new id instead.`)
		}

		// name
		if (prevLayer.name !== nextLayer.name) {
			batch.dispatchEvent({
				type: 'layer:change:name',
				data: {
					id: nextLayer.id,
					name: nextLayer.name,
				},
			})
		}

		// props
		const diff = propsDiff(prevLayer.props, nextLayer.props)
		if (diff) {
			batch.dispatchEvent({
				type: 'layer:change:props',
				data: {
					id: nextLayer.id,
					props: nextLayer.props,
					changedKeys: diff,
				},
			})
		}

		// data props
		if (
			(!prevLayer.dataProps && nextLayer.dataProps) ||
			(prevLayer.dataProps && !nextLayer.dataProps) ||
			(prevLayer.dataProps &&
				nextLayer.dataProps &&
				!propsEqual(prevLayer.dataProps, nextLayer.dataProps))
		) {
			batch.dispatchEvent({
				type: 'layer:change:dataProps',
				data: {
					id: nextLayer.id,
					dataProps: nextLayer.dataProps || {},
				},
			})
		}
	}

	// stages
	const prevStageIds = prev.stages.map((stage) => stage.id)
	const nextStageIds = next.stages.map((stage) => stage.id)

	// remove stages
	for (const prevStageId of prevStageIds) {
		if (!nextStageIds.includes(prevStageId)) {
			batch.dispatchEvent({
				type: 'stage:remove',
				data: {
					id: prevStageId,
				},
			})
		}
	}

	// add stages
	for (const nextStage of next.stages) {
		if (!prevStageIds.includes(nextStage.id)) {
			batch.dispatchEvent({
				type: 'stage:add',
				data: nextStage,
			})
		}
	}

	// update stages
	for (const nextStage of next.stages) {
		const prevStage = prev.stages.find((stage) => stage.id === nextStage.id)

		if (!prevStage) continue

		// name
		if (prevStage.name !== nextStage.name) {
			batch.dispatchEvent({
				type: 'stage:change:name',
				data: {
					id: nextStage.id,
					name: nextStage.name,
				},
			})
		}

		// layers
		if (!idsEqual(prevStage.layers, nextStage.layers)) {
			batch.dispatchEvent({
				type: 'stage:change:layers',
				data: {
					id: nextStage.id,
					layers: nextStage.layers,
				},
			})
		}

		// projection
		if (prevStage.projection !== nextStage.projection) {
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
	const prevSceneIds = prev.scenes.map((scene) => scene.id)
	const nextSceneIds = next.scenes.map((scene) => scene.id)

	// remove scenes
	for (const prevSceneId of prevSceneIds) {
		if (!nextSceneIds.includes(prevSceneId)) {
			batch.dispatchEvent({
				type: 'scene:remove',
				data: {
					id: prevSceneId,
				},
			})
		}
	}

	// add scenes
	for (const nextScene of next.scenes) {
		if (!prevSceneIds.includes(nextScene.id)) {
			batch.dispatchEvent({
				type: 'scene:add',
				data: nextScene,
			})
		}
	}

	// update scenes
	for (const nextScene of next.scenes) {
		const prevScene = prev.scenes.find((scene) => scene.id === nextScene.id)

		if (!prevScene) continue

		// name
		if (prevScene.name !== nextScene.name) {
			batch.dispatchEvent({
				type: 'scene:change:name',
				data: {
					id: nextScene.id,
					name: nextScene.name,
				},
			})
		}

		if (prevScene.stage !== nextScene.stage) {
			batch.dispatchEvent({
				type: 'scene:change:stage',
				data: {
					id: nextScene.id,
					stage: nextScene.stage,
				},
			})
		}

		// layers
		if (!idsEqual(prevScene.layers, nextScene.layers)) {
			batch.dispatchEvent({
				type: 'scene:change:layers',
				data: {
					id: nextScene.id,
					layers: nextScene.layers,
				},
			})
		}

		// cameraStateCode
		if (prevScene.cameraStateCode !== nextScene.cameraStateCode) {
			batch.dispatchEvent({
				type: 'scene:change:cameraStateCode',
				data: {
					id: nextScene.id,
					cameraStateCode: nextScene.cameraStateCode,
				},
			})
		}
	}

	// data stubs
	const prevDataStubIds = prev.dataStubs?.map((dataStub) => dataStub.id) || []
	const nextDataStubIds = next.dataStubs?.map((dataStub) => dataStub.id) || []

	// remove data stubs
	for (const prevDataStubId of prevDataStubIds) {
		if (!nextDataStubIds.includes(prevDataStubId)) {
			batch.dispatchEvent({
				type: 'data:remove',
				data: {
					id: prevDataStubId,
				},
			})
		}
	}

	// add data stubs
	for (const nextDataStub of next.dataStubs || []) {
		if (!prevDataStubIds.includes(nextDataStub.id)) {
			batch.dispatchEvent({
				type: 'data:add',
				data: nextDataStub,
			})
		}
	}

	// update data stubs
	for (const nextDataStub of next.dataStubs || []) {
		const prevDataStub = prev.dataStubs?.find((dataStub) => dataStub.id === nextDataStub.id)
		if (!prevDataStub) continue

		// name
		if (prevDataStub.name !== nextDataStub.name) {
			batch.dispatchEvent({
				type: 'data:change:name',
				data: {
					id: nextDataStub.id,
					name: nextDataStub.name,
				},
			})
		}

		// initialValue
		if (!deepEqual(prevDataStub.initialValue, nextDataStub.initialValue)) {
			batch.dispatchEvent({
				type: 'data:change:initialValue',
				data: {
					id: nextDataStub.id,
					initialValue: nextDataStub.initialValue,
				},
			})
		}
	}

	// scripts
	const prevScriptIds = prev.$scripts?.map((script) => script.id) || []
	const nextScriptIds = next.$scripts?.map((script) => script.id) || []

	// remove scripts
	for (const prevScriptId of prevScriptIds) {
		if (!nextScriptIds.includes(prevScriptId)) {
			batch.dispatchEvent({
				type: 'script:remove',
				data: { id: prevScriptId },
			})
		}
	}

	// add scripts
	for (const nextScript of next.$scripts || []) {
		if (!prevScriptIds.includes(nextScript.id)) {
			batch.dispatchEvent({
				type: 'script:add',
				data: nextScript,
			})
		}
	}

	// update scripts
	for (const nextScript of next.$scripts || []) {
		const prevScript = prev.$scripts?.find((script) => script.id === nextScript.id)
		if (!prevScript) continue

		// name
		if (prevScript.name !== nextScript.name) {
			batch.dispatchEvent({
				type: 'script:change:name',
				data: { id: nextScript.id, name: nextScript.name },
			})
		}

		// eventType
		if (prevScript.eventType !== nextScript.eventType) {
			batch.dispatchEvent({
				type: 'script:change:eventType',
				data: { id: nextScript.id, eventType: nextScript.eventType },
			})
		}

		// handler
		if (prevScript.handler !== nextScript.handler) {
			batch.dispatchEvent({
				type: 'script:change:handler',
				data: { id: nextScript.id, handler: nextScript.handler },
			})
		}

		// targets
		if (!scriptTargetsEqual(prevScript.targets, nextScript.targets)) {
			batch.dispatchEvent({
				type: 'script:change:targets',
				data: { id: nextScript.id, targets: nextScript.targets },
			})
		}
	}

	// 按照依赖顺序触发事件

	batch.events.sort((a, b) => getEventOrder(a.type) - getEventOrder(b.type))

	batch.flush()
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

/**
 * 执行顺序，不设定则为0，从小到大执行
 * - 内存效率
 * 	- 先删除，后处理修改，最后添加
 * - 依赖关系
 * 	- 添加时，自底向上
 * 	- 删除时，自顶向下
 *
 * @note @attention
 * 无法精确的保证事件触发过程中依赖关系正确：
 * - 新建一个layer并加到scene和stage中，可能触发三个事件
 * 		- 如果先触发 scene:change:layers，此时过滤到的 layer 是不存在的
 * 		- 如果先触发 stage:change:layers，此时layer还没创建，也无法添加
 * - 删除一个layer，可能触发三个事件
 * 		- 如果先触发 layer:remove, 会导致scene和stage中出现不存在的layer
 *
 * !!实现中必须兼容这些情况的循序不确定性，
 * 换句话说，stage 和 scene 中的 layers 过滤器的不匹配是正常的
 *
 * @note
 * layer 和其 所使用的 dataStub 一同修改，可能会触发多次 *等效的* layer 重建。
 * 因为无法准确保证依赖的前后顺序。
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
