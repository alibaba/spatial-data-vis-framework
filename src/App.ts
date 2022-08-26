import { AppBase, AppBaseConfig } from './private/base/AppBase'

import { stages } from './stages/index'

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
	constructor(container: HTMLDivElement, config?: AppBaseConfig) {
		super(container, config, stages)
	}

	// low-code 生成的成员与方法

	// pragma: BP_GEN APP_MEMBERS START
	// pragma: BP_GEN APP_MEMBERS END

	// pragma: BP_GEN APP_METHODS START
	// pragma: BP_GEN APP_METHODS END

	// pro-code 编写的成员，在此区域编写代码 🔨

	// pragma: BP_CUSTOM APP_MEMBERS START
	// pragma: BP_CUSTOM APP_MEMBERS END

	// pro-code 编写的方法，在此区域编写代码 🔨
	// pragma: BP_CUSTOM APP_METHODS START
	// pragma: BP_CUSTOM APP_METHODS END
}
