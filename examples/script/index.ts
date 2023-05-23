import { App } from '../../src/apps/App'
import { BPConfig } from '../../src/config/template'

const container = document.getElementById('container') as HTMLDivElement

BPConfig.$scripts = [
	{
		name: 'script 0',
		id: 'LOCAL_SCRIPT_0',
		type: 'bus' as const,
		eventType: 'scriptInit' as const,
		handler: /* javascript */ `
			console.log('app init-ed', event)
		`,
		targets: [{ type: 'layer', id: 'LOCAL_LAYER_0' }],
	},
	{
		name: 'script 1',
		id: 'LOCAL_SCRIPT_1',
		type: 'bus' as const,
		eventType: 'scriptInit' as const,
		handler: /* javascript */ `
			event.busAgent.on('start', (event) => {
				console.log('start', event)
			})
		`,
		targets: [{ type: 'layer', id: 'LOCAL_LAYER_0' }],
	},
	{
		name: 'script 2',
		id: 'LOCAL_SCRIPT_2',
		type: 'bus' as const,
		eventType: 'scriptInit' as const,
		handler: /* javascript */ `
			let count = 0
			const tickHandler = (e) => {
				console.log('app tick', count, e)
				count++
				if (count >= 10) {
					console.log('off')

					event.busAgent.off('tick', tickHandler)
				}
			}

			event.busAgent.on('tick', tickHandler)
		`,
		targets: [{ type: 'layer', id: 'LOCAL_LAYER_0' }],
	},
	{
		name: 'script 3',
		id: 'LOCAL_SCRIPT_3',
		type: 'bus' as const,
		eventType: 'scriptInit' as const,
		handler: /* javascript */ `
			event.busAgent.on('beforeSceneChange', (event) => {
				console.log('beforeSceneChange hijack', event)
				event.duration = 1000
			})
		`,
		targets: [{ type: 'app', id: '' }],
	},
	{
		name: 'script 4',
		id: 'LOCAL_SCRIPT_4',
		type: 'bus' as const,
		eventType: 'scriptInit' as const,
		handler: /* javascript */ `
			event.busAgent.on('beforeUpdateData', (event) => {
				console.log('beforeUpdateData', event, event.value)
				console.log('data is broken, lets fix it')

				event.value = (() => {
					const res = [] 
					const W = 3
					const H = 3
					const scale = 0.0015
					for (let i = 0; i < W; i++) {
						for (let j = 0; j < H; j++) {
							res.push({
								lng: +((Math.random() - 0.5) * W * scale).toFixed(3),
								lat: +((Math.random() - 0.5) * H * scale).toFixed(3),
							})
						}
					}
					return res
				})()
			})
		`,
		targets: [{ type: 'app', id: '' }],
	},
	{
		name: 'script 5',
		id: 'LOCAL_SCRIPT_5',
		type: 'bus' as const,
		eventType: 'start' as any,
		handler: /* javascript */ `
			console.log('start', event)
		`,
		targets: [{ type: 'app', id: '' }],
	},
]

const polarisApp = new App(container, BPConfig)

setTimeout(() => {
	polarisApp.changeScene('LOCAL_SCENE_2')
}, 1000)

setTimeout(() => {
	setInterval(() => {
		polarisApp.updateDataStub('LOCAL_DATA_0', ['broken data'])
	}, 1000)
}, 3000)
