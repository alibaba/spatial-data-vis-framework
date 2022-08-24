import { PolarisThree } from '@polaris.gl/three'
import { StandardLayer } from '@polaris.gl/gsi'

import { SceneBase } from './SceneBase'
import { ScriptBase } from './ScriptBase'
import { StageBase } from './StageBase'

/**
 * Entry class
 */
export class AppBase {
	readonly polaris: PolarisThree
	readonly layers = [] as StandardLayer[]

	private readonly scenes = [] as SceneBase[]
	private readonly stages = [] as StageBase[]
	private readonly scripts = [] as ScriptBase[]

	constructor(container: HTMLDivElement, config) {}

	changeScene() {}
	getSceneList() {}
	getCurrentScene() {}

	// global stats
	static {}
}
