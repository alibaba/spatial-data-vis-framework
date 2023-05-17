import { App } from '../../src/apps/App'
import { BPConfig } from '../../src/config/template'

const container = document.getElementById('container') as HTMLDivElement

console.log(BPConfig)

const polarisApp = new App(container, BPConfig)

const eventBus = polarisApp.getEventBusAgent(this)

eventBus.on('afterInit', (event) => {
	// this one will be missed
	console.log('app init-ed', event)
})

eventBus.on('start', (event) => {
	console.log('start', event)

	// emit custom event
	eventBus.emit('$custom:foo', { haha: 123 })
})

let count = 0
const tickHandler = (event) => {
	console.log('app tick', count, event)
	count++
	if (count >= 10) {
		console.log('off')

		eventBus.off('tick', tickHandler)
	}
}

eventBus.on('tick', tickHandler)

eventBus.on('dispose', (event) => {
	console.log('dispose', event)
})

eventBus.on('afterSceneChange', (event) => {
	console.log('afterSceneChange', event)
})

eventBus.on('$custom:foo', (event) => {
	console.log('$custom:foo', event)
})

setTimeout(() => {
	polarisApp.changeScene('LOCAL_SCENE_2')
}, 2000)

setTimeout(() => {
	eventBus.on('beforeSceneChange', (event) => {
		console.log('beforeSceneChange hijack', event)
		event.duration = 1000
	})
	polarisApp.changeScene('LOCAL_SCENE_DEFAULT')
}, 3000)

setTimeout(() => {
	eventBus.on('beforeUpdateData', (event) => {
		console.log('beforeUpdateData', event, event.value)
		console.log('data is broken, lets fix it')

		event.value = (() => {
			const res = [] as any[]
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

	setInterval(() => {
		polarisApp.updateDataStub('LOCAL_DATA_0', ['broken data'])
	}, 1000)
}, 4000)
