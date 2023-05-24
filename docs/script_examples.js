/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * @file 脚本使用案例，可作为模版使用
 */

/**
 * @type {import('../src/private/schema/scripts').ScriptConfig}
 */
var scriptConfig

/**
 * 监听生命周期
 * @template
 */

scriptConfig = {
	// ...
	eventType: 'scriptInit', // 配置生效后立刻触发，可以获得事件总线并添加更多的监听器
	target: [{ type: 'app', id: '' }], // 挂载到 app 上
	handler: /* javascript */ `
		console.log('script init-ing.')

		const { busAgent } = event.target

		eventBus.on('afterInit', (event) => {
			console.log('app init-ed', event)
		})

		eventBus.on('tick', (event) => {
			console.log('app tick', event)
		})

		eventBus.on('dispose', (event) => {
			console.log('app dispose', event)
		})
	`,
}

/**
 * 监听特定生命周期
 */

scriptConfig = {
	// ...
	eventType: 'afterInit',
	target: [{ type: 'app', id: '' }], // 挂载到 app 上
	handler: /* javascript */ `
		console.log('app init-ed', event)
	`,
}

/**
 * 拦截数据更新(scriptInit)
 * @template
 */

scriptConfig = {
	// ...
	eventType: 'scriptInit', // 配置生效后立刻触发，可以获得事件总线并添加更多的监听器
	target: [{ type: 'app', id: '' }], // 挂载到 app 上
	handler: /* javascript */ `
		console.log('script init-ing.')

		const { busAgent } = event.target

		eventBus.on('beforeUpdateData', (event) => {
			console.log('beforeUpdateData', event)
			check(event.value)
			event.value = filter(event.value)
		})

		function check(value) {}
		function filter(value) { return value }
	`,
}

/**
 * 拦截数据更新(beforeUpdateData)
 * @template
 */

scriptConfig = {
	// ...
	eventType: 'beforeUpdateData',
	target: [{ type: 'app', id: '' }], // 挂载到 app 上
	handler: /* javascript */ `
		console.log('beforeUpdateData', event)
		check(event.value)
		event.value = filter(event.value)

		function check(value) {}
		function filter(value) { return value }
	`,
}

/**
 * 拦截场景切换(scriptInit)
 * @template
 */

scriptConfig = {
	// ...
	eventType: 'scriptInit', // 配置生效后立刻触发，可以获得事件总线并添加更多的监听器
	target: [{ type: 'app', id: '' }], // 挂载到 app 上
	handler: /* javascript */ `
		console.log('script init-ing.')

		const { busAgent } = event.target

		eventBus.on('beforeSceneChange', (event) => {
			console.log('beforeSceneChange', event)
			// event.duration = 1000
		})
	`,
}

/**
 * 拦截场景切换(beforeSceneChange)
 * @template
 */

scriptConfig = {
	// ...
	eventType: 'beforeSceneChange',
	target: [{ type: 'app', id: '' }], // 挂载到 app 上
	handler: /* javascript */ `
		console.log('beforeSceneChange', event)
		// event.duration = 1000
	`,
}

/**
 * 接收自定义事件
 * @template
 */

scriptConfig = {
	// ...
	eventType: 'start',
	target: [
		{ type: 'layer', id: 'LOCAL_LAYER_1' },
		{ type: 'layer', id: 'LOCAL_LAYER_2' },
	],
	handler: /* javascript */ `
		const layer = event.currentTarget
		const app = event.target

		const busAgent = app.getBusAgent(layer)

		busAgent.on('$foo', (e) => {
			if (e.abc === layer.id) {
				console.log('I will hide.')
				layer.element.style.display = 'none'
			}
		})
	`,
}

// 外部用户
const app = new PolarisApp(config)
app.getBusAgent().emit('$foo', { abc: 'LOCAL_LAYER_2' })

/**
 * 发送自定义事件
 * @template
 */

scriptConfig = {
	// ...
	eventType: 'start',
	target: [
		{ type: 'layer', id: 'LOCAL_LAYER_1' },
		{ type: 'layer', id: 'LOCAL_LAYER_2' },
	],
	handler: /* javascript */ `
		const layer = event.currentTarget
		const app = event.target

		const busAgent = app.getBusAgent(layer)

		busAgent.emit('$bar', { greeting: layer.id + ' says hello!' })
	`,
}

/**
 * 修改 Layer 行为
 */

scriptConfig = {
	// ...
	eventType: 'start', // Layer 和 App 都实例化完成并开始运行后触发
	target: [{ type: 'layer', id: 'LOCAL_LAYER_1' }], // 挂载到 layer 上
	handler: /* javascript */ `
		const app = event.target
		const layer = event.currentTarget

		const div = document.createElement('div')
		layer.element.appendChild(div)

		// TODO: 三方依赖如何注入
		// layer.group.add(buildMesh())

		layer.addEventListener('viewChange', (event) => {
			if (event.camera.zoom > 10) {
				// @note layer.visible 由 场景切换逻辑管理，不要修改以免相互覆盖
				layer.group.visible = false
			} else {
				layer.group.visible = true
			}
		})
	`,
}

/**
 * layer 联动
 */

scriptConfig = {
	// ...
	eventType: 'start',
	target: [
		{ type: 'layer', id: 'LOCAL_LAYER_1' },
		{ type: 'layer', id: 'LOCAL_LAYER_2' },
	],
	handler: /* javascript */ `
		const layer = event.currentTarget
		const app = event.target

		const busAgent = app.getBusAgent(layer)

		layer.element.addEventListener('click', (event) => {
			busAgent.emit('$layerClick', event)
		})

		busAgent.on('$layerClick', (e) => {
			if (e.target === layer) {
				console.log('I am clicked')
			} else {
				console.log('The other one is clicked. I will hide.')
				layer.element.style.display = 'none'
			}
		})
	`,
}
