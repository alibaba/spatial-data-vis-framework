import type { StandardLayer } from '@polaris.gl/gsi'
import { HelperLayer } from '@polaris.gl/layer-std-helper'
import { PolarisThree } from '@polaris.gl/three'

import { EventDispatcher } from '../config/EventDispatcher'
import { EventBusAgent } from '../event/bus'
import type { BusEventMap } from '../event/events'
import type { AppConfig } from '../schema/config'
import type { AppMeta } from '../schema/meta'
import { partialFreeze } from '../utils/partialFreeze'
import { randomString } from '../utils/random'
import type { SceneBase } from './SceneBase'
import type { StageBase } from './StageBase'

/**
 * Entry class
 */
export class AppBase extends EventDispatcher<BusEventMap> {
	readonly polaris: PolarisThree

	disposed = false
	started = false

	currentSceneID: string | undefined = undefined

	readonly mainStage: StageBase
	readonly defaultScene: SceneBase

	constructor(
		container: HTMLDivElement,
		config: AppConfig,
		readonly stages: StageBase[] = [],
		readonly scenes: SceneBase[] = [],
		readonly layers: { layer: StandardLayer; name: string; id: string }[]
	) {
		super()

		this.polaris = new PolarisThree({ container, ...config.app })

		// this.polaris.timeline.updateMaxFPS(30)
		// @workaround flatten output breaks visibility inheritance
		this.polaris.renderer.conv.config.keepTopology = true
		this.polaris.renderer.renderer.outputEncoding = 3001 // sRGB

		this.stages.forEach((stage) => {
			this.polaris.add(stage)
			stage.visible = false
		})

		const mainStage = this.stages.find((stage) => stage.id === 'LOCAL_STAGE_MAIN')
		if (!mainStage) throw new Error('AppBase: Can not find main stage')
		this.mainStage = mainStage

		const defaultScene = this.scenes.find((scene) => scene.id === 'LOCAL_SCENE_DEFAULT')
		if (!defaultScene) throw new Error('AppBase: Can not find default scene')
		this.defaultScene = defaultScene

		const initialScene = config.app?.initialScene ?? 'LOCAL_SCENE_DEFAULT'
		this.changeScene(initialScene)

		// event: start & tick
		this.polaris.addEventListener('beforeRender', () => {
			if (!this.started) {
				this.started = true
				this.dispatchEvent(partialFreeze({ type: 'start', target: this }))
			}
			this.dispatchEvent(partialFreeze({ type: 'tick', target: this }))
		})

		if (config.app?.debug) {
			initDebug.call(this)
		}
	}

	/**
	 * 切换场景
	 */
	changeScene(
		/**
		 * 场景ID
		 */
		id: string,
		/**
		 * 切换动画时间
		 */
		duration?: number,
		/**
		 * 是否跳过机位控制
		 */
		skipCamera?: boolean
	) {
		// if (this.currentSceneID === id) {
		// 	console.log('Already in target scene.')
		// 	return
		// }

		this.currentSceneID = id
		const targetScene = this.scenes.find((scene) => scene.id === id)
		if (!targetScene) throw new Error(`AppBase: Can not find scene ${id}`)

		const targetStageID = targetScene.stage
		const targetStage = this.stages.find((stage) => stage.id === targetStageID)
		if (!targetStage) throw new Error(`AppBase: Can not find stage ${targetStageID}`)

		// filter stages
		this.stages.forEach((stage) => {
			if (stage.id === targetStageID) {
				stage.visible = true
			} else {
				stage.visible = false
			}
		})

		// filter layers in the stage
		targetStage.filterLayers(targetScene.layers)

		// event: beforeSceneChange
		// 该事件可以拦截并修改 duration 和 skipCamera
		const event = partialFreeze(
			{
				type: 'beforeSceneChange' as const,
				target: this,
				prevScene: this.currentSceneID,
				nextScene: id,
				duration,
				skipCamera,
			},
			['type', 'target', 'prevScene', 'nextScene']
		)
		this.dispatchEvent(event)

		// set camera
		if (!event.skipCamera && targetScene.cameraStateCode) {
			this.polaris.setStatesCode(targetScene.cameraStateCode, event.duration)
		}

		// event: afterSceneChange
		this.dispatchEvent(
			partialFreeze({
				type: 'afterSceneChange',
				target: this,
				prevScene: this.currentSceneID,
				nextScene: id,
			})
		)
	}

	// getSceneList() {}
	getCurrentScene() {
		if (!this.currentSceneID) return

		const currentScene = this.scenes.find((scene) => scene.id === this.currentSceneID)

		return currentScene
	}

	getCurrentStage() {
		return this.mainStage
	}

	getLayer(layerID: string, stageID?: string): undefined | StandardLayer {
		if (stageID) {
			const stage = this.stages.find((stage) => stage.id === stageID)
			if (!stage) return

			const layer = stage.getLayer(layerID)
			return layer
		} else {
			for (const stage of this.stages) {
				const layer = stage.getLayer(layerID)
				if (layer) return layer
			}
			return
		}
	}

	/**
	 * 获取 EventBus 代理对象
	 * @param target 接收事件时的 currentTarget 和 发送事件后接收方得到的 target
	 * @note 若不关心，target 可以传入 this 或 null
	 */
	getEventBusAgent(target: any = null) {
		return new EventBusAgent(this, target)
	}

	dispose() {
		// this.stages.forEach((e) => e.layers.forEach((l) => l.layer.dispose()))
		// this.stages.forEach((e) => e.dispose())
		// PolarisGSI 会遍历所有 layer 调用 dispose
		this.polaris.dispose()

		// event
		this.dispatchEvent(partialFreeze({ type: 'dispose', target: this }))
	}

	static $getMeta(): AppMeta {
		return { layers: {} }
	}
}

function initDebug(this: AppBase) {
	if (this.disposed) return

	const id = randomString(5)
	const appID = `APP_${id}`
	const polarisID = `P_${id}`
	console.log(
		`%c👷 Enable Debug Mode.\n>_ globalThis.${appID} for app instance.\n>_ globalThis.${polarisID} for polaris instance. `,
		'background: rgb(0,0,0); color: #ffffff; font-family: monospace; font-size: 15px; line-height: 20px;'
	)

	const h = new HelperLayer({ length: 100000000000000 })
	h.setProps({ box: true })
	this.polaris.add(h)

	if (globalThis[polarisID]) {
		console.warn(
			'found debug naming conflict:',
			'prev:',
			globalThis[polarisID],
			'curr:',
			this.polaris
		)
	} else {
		globalThis[polarisID] = this.polaris
		globalThis[appID] = this

		this.addEventListener('dispose', () => {
			delete globalThis[polarisID]
			delete globalThis[appID]
		})
	}

	// console.log('debug: app instance', this)
}

/**
 * find all the layers that use this data and call their `updateData` method if provided.
 */
// function dispatchDataToLayers(dataValue: any, dataID: string, app: AppBase) {
// 	const layers = app.stages.flatMap((stage) => stage.layers)
// 	layers.forEach((layer) => {
// 		const dataStubs = layer.dataStubs
// 		if (layer.layer['updateDataStub'] && layer.layer['dataStubs']) {
// 			layer.layer['updateDataStub'](dataValue, dataID)
// 		}
// 	})
// }
