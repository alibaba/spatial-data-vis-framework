import { AppBase, AppBaseConfig } from './private/base/AppBase'

import { stages, mainStage } from './stages/index'
import { scenes } from './scenes/index'
import type { WidgetConfig } from './layers/RuntimeWidget'

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
 */
export class App extends AppBase {
	// declare 细化子类的ts类型，充分静态类型检查
	protected declare mainStage: typeof mainStage

	constructor(container: HTMLDivElement, config?: AppBaseConfig) {
		super(container, config, stages, scenes)
	}

	// low-code 生成的成员与方法

	// pragma: BP_GEN APP_MEMBERS START
	// pragma: BP_GEN APP_MEMBERS END

	// pragma: BP_GEN APP_METHODS START
	// pragma: BP_GEN APP_METHODS END

	// 🌟 pro-code 编写的成员与方法，在此区域编写代码 🔨

	// pragma: BP_CUSTOM APP_MEMBERS START
	// pragma: BP_CUSTOM APP_MEMBERS END

	// pragma: BP_CUSTOM APP_METHODS START
	addRuntimeWidget(element: HTMLDivElement, config: WidgetConfig) {
		const runtimeWidgetLayer = this.mainStage.getLayer('LOCAL_LAYER_3').layer
		if (!runtimeWidgetLayer) throw new Error(`Cannot find runtime widget layer`)

		runtimeWidgetLayer.addWidget(element, config)
	}
	removeRuntimeWidget(id: number) {
		const runtimeWidgetLayer = this.mainStage.getLayer('LOCAL_LAYER_3').layer
		if (!runtimeWidgetLayer) throw new Error(`Cannot find runtime widget layer`)
	}
	// pragma: BP_CUSTOM APP_METHODS END
}
