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

	constructor(
		container: HTMLDivElement,
		protected readonly config?: AppBaseConfig,
		protected readonly stages: readonly StageBase[] = [],
		protected readonly scenes: readonly SceneBase[] = []
	) {
		this.polaris = new PolarisThree({ container, ...config })

		this.stages.forEach((stage) => {
			this.polaris.add(stage)
		})

		if (config?.debug) {
			initDebug.call(this)
		}
	}

	changeScene() {}
	// getSceneList() {}
	// getCurrentScene() {}

	// global stats
	static {}
}

export interface AppBaseConfig
	extends Pick<
		PolarisThreeProps,
		| 'width'
		| 'height'
		| 'antialias'
		| 'fov'
		| 'background'
		| 'autoResize'
		| 'enablePointer'
		| 'asyncRendering'
		| 'debug'
	> {
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
