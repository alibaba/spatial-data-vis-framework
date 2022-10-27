import { PolarisThree, PolarisThreeProps } from '@polaris.gl/three'
import { StandardLayer } from '@polaris.gl/gsi'

import { HelperLayer } from '@polaris.gl/layer-std-helper'

import type { SceneBase } from './SceneBase'
import type { ScriptBase } from './ScriptBase'
import type { StageBase } from './StageBase'

/**
 * Entry class
 */
export class AppBase {
	readonly polaris: PolarisThree
	// readonly layers = [] as StandardLayer[]

	disposed = false

	currentSceneID: string | undefined = undefined

	readonly mainStage: StageBase
	readonly defaultScene: SceneBase

	constructor(
		container: HTMLDivElement,
		readonly config: AppBaseConfig,
		readonly stages: readonly StageBase[] = [],
		readonly scenes: readonly SceneBase[] = []
	) {
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

		this.changeScene('LOCAL_SCENE_DEFAULT')

		if (config.app?.debug) {
			initDebug.call(this)
		}
	}

	changeScene(id: string, duration?: number) {
		if (this.currentSceneID !== id) {
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

			// cameraStateCode
			if (targetScene.cameraStateCode) {
				this.polaris.setStatesCode(targetScene.cameraStateCode, duration)
			}
		} else {
			console.log('Already in target scene.')
		}
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

	getLayer(layerID: string, stageID?: string) {
		if (stageID) {
			const stage = this.stages.find((stage) => stage.id === stageID)
			if (!stage) return

			const layer = stage.layers.find((layer) => layer.id === layerID)
			return layer?.layer
		} else {
			for (const stage of this.stages) {
				const layer = stage.layers.find((layer) => layer.id === layerID)
				if (layer) return layer.layer
			}
			return
		}
	}

	// global stats
	static {}

	static $getLayerClasses() {}
}

export interface AppBaseConfig {
	version: '0.0.1'
	app: Pick<
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
		| 'debug'
	>
	// stages: { [name: string]: StageBase }
	// scenes: { [name: string]: SceneBase }
	// scripts: { [name: string]: ScriptBase }
}

function initDebug(this: AppBase) {
	if (this.disposed) return

	const h = new HelperLayer({ length: 100000000000000 })
	h.setProps({ box: true })
	this.polaris.add(h)

	if (globalThis.p) {
		console.warn('监测到 window 上挂了另外一个 polaris', globalThis.p)
		console.log('当前实例', this.polaris)
	} else {
		globalThis.p = this.polaris
		globalThis.app = this
	}

	console.log(this)
}
