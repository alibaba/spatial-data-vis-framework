import type { ScriptConfig } from '../schema/scripts'
import type { EventBusAgent } from './../event/bus'
import type { AppBase } from './AppBase'

/**
 * Event Based Script System
 * - one script instance per event config
 * - one listener (on event bus) per script instance
 * - execute handler on each target
 */
export class ScriptBase {
	readonly id: string

	#name: string
	#eventType: ScriptConfig['eventType']

	#handlerCode: string
	#targets: ScriptConfig['targets']

	#app: AppBase

	#busAgents: EventBusAgent[] = []

	constructor(app: AppBase, config: ScriptConfig) {
		this.id = config.id
		this.#name = config.name
		this.#eventType = config.eventType
		this.#handlerCode = config.handler
		this.#targets = config.targets
		this.#app = app

		this.init()
	}

	changeName(name: string) {
		this.#name = name
	}

	changeEventType(eventType: ScriptConfig['eventType']) {
		this.cleanUp()
		this.#eventType = eventType
		this.init()
	}

	changeHandler(handler: string) {
		this.cleanUp()
		this.#handlerCode = handler
		this.init()
	}

	changeTargets(targets: ScriptConfig['targets']) {
		this.cleanUp()
		this.#targets = targets
		this.init()
	}

	private init() {
		// 如果是 scriptInit 类型的事件脚本，就直接在每个target上执行
		// 否则，就监听全局事件，并转发给每个target

		if (this.#eventType === 'scriptInit') {
			// 立即运行 handler

			// @note 如果用eval会直接暴露当前的闭包
			// eslint-disable-next-line @typescript-eslint/ban-types
			let fun: Function
			try {
				fun = new Function('e', POLYFILL + this.#handlerCode)
			} catch (error: any) {
				error.message = `ScriptBase: Script(${this.#name}) init failed: ${error.message}`
				throw error
			}

			this.#targets.forEach((targetInfo) => {
				let target: any
				if (targetInfo.type === 'app') target = this.#app
				if (targetInfo.type === 'stage')
					target = this.#app.stages.find((stage) => stage.id === targetInfo.id)
				if (targetInfo.type === 'layer')
					target = this.#app.layers.find((layer) => layer.id === targetInfo.id)?.layer

				if (!target) {
					console.error(`ScriptBase: Can not find target ${targetInfo.type} ${targetInfo.id}.`)
					return
				}

				// 构造 Script Init Event
				const busAgent = this.#app.getEventBusAgent(target)
				this.#busAgents.push(busAgent)
				const event = Object.freeze({
					type: 'scriptInit',
					target: null,
					currentTarget: null,
					busAgent,
				})

				// 运行 handler

				try {
					fun(event)
				} catch (error: any) {
					error.message = `ScriptBase: Script(${this.#name}) execution failed: ${error.message}`
					throw error
				}
			})
		} else {
			// 监听事件
			const busAgent = this.#app.getEventBusAgent(null) // 会分发给多个target，分发时修改 target 和 currentTarget
			this.#busAgents.push(busAgent)
			busAgent.on(this.#eventType, (e) => this.run(e))
		}
	}

	// 监听到全局事件后，在每个 target 上执行
	private run(event: Record<string, any>) {
		// eslint-disable-next-line @typescript-eslint/ban-types
		let fun: Function
		try {
			fun = new Function('e', POLYFILL + this.#handlerCode)
		} catch (error: any) {
			error.message = `ScriptBase: Script(${this.#name}) init failed: ${error.message}`
			throw error
		}

		this.#targets.forEach((targetInfo) => {
			let target: any
			if (targetInfo.type === 'app') target = this.#app
			if (targetInfo.type === 'stage')
				target = this.#app.stages.find((stage) => stage.id === targetInfo.id)
			if (targetInfo.type === 'layer')
				target = this.#app.layers.find((layer) => layer.id === targetInfo.id)?.layer

			if (!target) {
				console.error(`ScriptBase: Can not find target ${targetInfo.type} ${targetInfo.id}.`)
				return
			}

			// 构造 Event
			// @note 这里的 event 是只读的，不能直接修改
			Object.defineProperty(event, 'currentTarget', {
				value: target,
				writable: false,
				enumerable: true,
				configurable: true,
			})

			// 运行 handler

			try {
				fun(event)
			} catch (error: any) {
				error.message = `ScriptBase: Script(${this.#name}) execution failed: ${error.message}`
				throw error
			}
		})
	}

	// 清除当前 script 的已经造成的所有影响
	private cleanUp() {
		// 清除所有监听
		this.#busAgents.forEach((busAgent) => busAgent.dispose())
		this.#busAgents = []

		// 重建相关的 layer 实例，暂时不重建 stage 和 app 实例
		this.#targets.forEach((targetInfo) => {
			if (targetInfo.type === 'layer') {
				this.#app['recreateLayer'](targetInfo.id, 'script_dispose')
			} else {
				console.warn(
					'ScriptBase: 挂载在 app 或 stage 上的脚本暂时不支持清除，请注意是否存在副作用，可能需要重载应用已清除'
				)
			}
		})
	}

	dispose() {
		// 清除所有监听
		this.#busAgents.forEach((busAgent) => busAgent.dispose())
		this.#busAgents = []
	}
}

const POLYFILL = /* javascript */ `
// Script Polyfill Start
const event = e
// Script Polyfill End
`
