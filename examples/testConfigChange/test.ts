import { App } from '../../src/apps/App'
import { BPConfig } from './config'

const container = document.getElementById('container') as HTMLDivElement

const polarisApp = new App(container, BPConfig)

let testIndex = 0
function test(name: string, f: () => void) {
	testIndex++
	setTimeout(() => {
		// console.time('^')
		console.group(name)
		f()
		console.groupEnd()
		// console.timeEnd('^')
	}, testIndex * 300)
}

function shouldThrow(f: () => void) {
	try {
		f()
		console.error('should throw, but did not')
	} catch (e: any) {
		console.log('throws as expected: \n\t', e.message)
	}
}

const m = polarisApp.configManager

{
	m.addEventListener('init', (e) => console.log('init', e))

	m.addEventListener('app:change', (e) => console.log('app:change', e))

	m.addEventListener('layer:add', (e) => console.log('layer:add', e))
	m.addEventListener('layer:remove', (e) => console.log('layer:remove', e))
	m.addEventListener('layer:change:name', (e) => console.log('layer:change:name', e))
	m.addEventListener('layer:change:props', (e) => console.log('layer:change:props', e))

	m.addEventListener('stage:add', (e) => console.log('stage:add', e))
	m.addEventListener('stage:remove', (e) => console.log('stage:remove', e))
	m.addEventListener('stage:change:name', (e) => console.log('stage:change:name', e))
	m.addEventListener('stage:change:layers', (e) => console.log('stage:change:layers', e))
	m.addEventListener('stage:change:projection', (e) => console.log('stage:change:projection', e))

	m.addEventListener('scene:add', (e) => console.log('scene:add', e))
	m.addEventListener('scene:remove', (e) => console.log('scene:remove', e))
	m.addEventListener('scene:change:name', (e) => console.log('scene:change:name', e))
	m.addEventListener('scene:change:cameraStateCode', (e) =>
		console.log('scene:change:cameraStateCode', e)
	)
	m.addEventListener('scene:change:stage', (e) => console.log('scene:change:stage', e))
	m.addEventListener('scene:change:layers', (e) => console.log('scene:change:layers', e))

	m.addEventListener('data:add', (e) => console.log('data:add', e))
	m.addEventListener('data:remove', (e) => console.log('data:remove', e))
	m.addEventListener('data:change:name', (e) => console.log('data:change:name', e))
	m.addEventListener('data:change:initialValue', (e) => console.log('data:change:initialValue', e))

	m.addEventListener('script:add', (e) => console.log('script:add', e))
	m.addEventListener('script:remove', (e) => console.log('script:remove', e))
	m.addEventListener('script:change:name', (e) => console.log('script:change:name', e))
	m.addEventListener('script:change:eventType', (e) => console.log('script:change:eventType', e))
	m.addEventListener('script:change:handler', (e) => console.log('script:change:handler', e))
	m.addEventListener('script:change:targets', (e) => console.log('script:change:targets', e))
}

test('resize', () => {
	m.action({ type: 'app:change', payload: { width: 500, height: 500 } })
})
test('resize', () => {
	m.action({ type: 'app:change', payload: { width: 1000, height: 1000 } })
})

test('remove layer', () => {
	m.action({ type: 'layer:remove', payload: { id: 'LOCAL_LAYER_1' } })
})

test('add layer', () => {
	m.action({
		type: 'layer:add',
		payload: {
			name: 'model',
			id: 'LOCAL_LAYER_4' as const,
			class: 'ModelLayer' as const,
			props: {
				scale: 50,
				glb: '/assets/models/demo.glb',
				projectionDesc: 'desc0|MercatorProjection|right|meters|0,0,0',
			},
		},
	})
})

test('rename layer', () => {
	m.action({
		type: 'layer:change:name',
		payload: { id: 'LOCAL_LAYER_4', name: 'LOCAL_LAYER_4_RENAMED' },
	})
})

test('change layer props', () => {
	const layerConfig = m.getConfig().layers.find((l) => l.id === 'LOCAL_LAYER_2')
	if (!layerConfig) throw new Error('layer not found')
	const oldProps = layerConfig.props
	m.action({
		type: 'layer:change:props',
		payload: {
			id: 'LOCAL_LAYER_2',
			props: {
				// @note 由于这里直接替代，会导致config中的props不完整，重建时才会显现
				...oldProps,
				size: { x: 20, y: 30 },
			},
		},
	})
})

test('add stage', () => {
	shouldThrow(() => {
		m.action({
			type: 'stage:add',
			payload: {
				id: '223455',
			} as any,
		})
	})
})

test('add scene', () => {
	shouldThrow(() => {
		m.action({
			type: 'scene:add',
			payload: {
				id: 'LOCAL_SCENE_2',
				name: 'scene2',
				cameraStateCode: '1|0.000200|0.000943|0.000000|0.99540|-0.48000|19.27600',
				stage: 'LOCAL_STAGE_MAIN' as const,
				layers: ['LOCAL_LAYER_1', 'LOCAL_LAYER_3'],
			},
		})
	})
})

test('add scene', () => {
	m.action({
		type: 'scene:add',
		payload: {
			id: 'LOCAL_SCENE_3',
			name: 'scene3',
			cameraStateCode: '1|0.000200|0.000943|0.000000|0.99540|-0.48000|19.27600',
			stage: 'LOCAL_STAGE_MAIN' as const,
			layers: ['LOCAL_LAYER_1', 'LOCAL_LAYER_3'],
		},
	})
})

test('change to new scene', () => {
	polarisApp.changeScene('LOCAL_SCENE_3')
	setTimeout(() => {
		polarisApp.changeScene('LOCAL_SCENE_DEFAULT')
	}, 200)
})

test('change current scene layers', () => {
	m.action({
		type: 'scene:change:layers',
		payload: {
			id: 'LOCAL_SCENE_DEFAULT',
			layers: ['LOCAL_LAYER_1', 'LOCAL_LAYER_3'],
		},
	})
})

test('change current scene layers (back)', () => {
	m.action({
		type: 'scene:change:layers',
		payload: {
			id: 'LOCAL_SCENE_DEFAULT',
			layers: ['*'],
		},
	})
})

test('change current scene cam', () => {
	m.action({
		type: 'scene:change:cameraStateCode',
		payload: {
			id: 'LOCAL_SCENE_DEFAULT',
			cameraStateCode: '1|-0.000193|-0.000708|0.000000|0.88540|-0.37000|17.47600',
		},
	})
})

test('add a layer that uses a data stub', () => {
	m.action({
		type: 'data:add',
		payload: {
			id: 'LOCAL_DATA_0',
			name: 'data0',
			initialValue: [{ lng: 0, lat: 0.001 }],
		},
	})
	m.action({
		type: 'layer:add',
		payload: {
			name: 'sparkles',
			id: 'LOCAL_LAYER_5' as const,
			class: 'BillboardsLayer' as const,
			props: {
				texture:
					'https://img.alicdn.com/imgextra/i2/O1CN011m2m5e1ge4nqQrNQy_!!6000000004166-2-tps-160-160.png',
				flickerSpeed: 0.1,
				pivot: { x: 0.5, y: 0 },
				density: 1,
				size: { x: 50, y: 50 },
			},
			dataProps: {
				data: 'LOCAL_DATA_0',
			},
		},
	})
})

test('add a layer and a related data stub (together)', () => {
	m.actions([
		{
			type: 'data:add',
			payload: {
				id: 'LOCAL_DATA_1',
				name: 'data0',
				initialValue: [{ lng: 0, lat: 0.001 }],
			},
		},
		{
			type: 'layer:add',
			payload: {
				name: 'sparkles',
				id: 'LOCAL_LAYER_6' as const,
				class: 'BillboardsLayer' as const,
				props: {
					texture:
						'https://img.alicdn.com/imgextra/i2/O1CN011m2m5e1ge4nqQrNQy_!!6000000004166-2-tps-160-160.png',
					flickerSpeed: 0.1,
					pivot: { x: 0.5, y: 0 },
					density: 1,
					size: { x: 50, y: 50 },
				},
				dataProps: {
					data: 'LOCAL_DATA_1',
				},
			},
		},
	])
})

test('rm a layer and its related data stub (together)', () => {
	m.actions([
		{
			type: 'data:remove',
			payload: {
				id: 'LOCAL_DATA_1',
			},
		},
		{
			type: 'layer:remove',
			payload: {
				id: 'LOCAL_LAYER_6' as const,
			},
		},
	])
})

test('change a layer to use a non-existent data stub', () => {
	shouldThrow(() => {
		m.action({
			type: 'layer:change:dataProps',
			payload: {
				id: 'LOCAL_LAYER_5' as const,
				dataProps: {
					data: 'LOCAL_DATA_1',
				},
			},
		})
	})

	console.log('change back')

	m.action({
		type: 'layer:change:dataProps',
		payload: {
			id: 'LOCAL_LAYER_5' as const,
			dataProps: {
				data: 'LOCAL_DATA_0',
			},
		},
	})
})

test('change a data stub name', () => {
	m.action({
		type: 'data:change:name',
		payload: {
			id: 'LOCAL_DATA_0',
			name: 'data2',
		},
	})
})

test('change a used data stub initialValue', () => {
	m.action({
		type: 'data:change:initialValue',
		payload: {
			id: 'LOCAL_DATA_0',
			initialValue: [{ lng: 0, lat: -0.001 }],
		},
	})
})

test('rm a used data stub', () => {
	shouldThrow(() => {
		m.action({
			type: 'data:remove',
			payload: {
				id: 'LOCAL_DATA_0',
			},
		})
	})
})

test('script: add & remove', () => {
	m.action({
		type: 'script:add',
		payload: {
			name: 'script 0',
			id: 'LOCAL_SCRIPT_0',
			type: 'bus' as const,
			eventType: 'scriptInit' as const,
			handler: /* javascript */ `console.log('foo')`,
			targets: [],
		},
	})
	shouldThrow(() => {
		m.action({
			type: 'script:add',
			payload: {
				name: 'script 0',
				id: 'LOCAL_SCRIPT_0',
				type: 'bus' as const,
				eventType: 'scriptInit' as const,
				handler: /* javascript */ `console.log('foo')`,
				targets: [],
			},
		})
	})

	m.action({
		type: 'script:add',
		payload: {
			name: 'script 1',
			id: 'LOCAL_SCRIPT_1',
			type: 'bus' as const,
			eventType: 'scriptInit' as const,
			handler: /* javascript */ `console.log('foo 1')`,
			targets: [
				{
					type: 'layer',
					id: 'LOCAL_LAYER_0',
				},
			],
		},
	})
})

test('script: change name/eventType/handler', () => {
	m.action({
		type: 'script:change:name',
		payload: {
			id: 'LOCAL_SCRIPT_0',
			name: 'script 1',
		},
	})

	m.action({
		type: 'script:change:eventType',
		payload: {
			id: 'LOCAL_SCRIPT_0',
			eventType: 'start' as const,
		},
	})

	m.action({
		type: 'script:change:handler',
		payload: {
			id: 'LOCAL_SCRIPT_0',
			handler: /* javascript */ `console.log('bar')`,
		},
	})
})

test('script: change targets', () => {
	m.action({
		type: 'script:change:targets',
		payload: {
			id: 'LOCAL_SCRIPT_0',
			targets: [
				{
					type: 'layer',
					id: 'LOCAL_LAYER_0',
				},
			],
		},
	})
	m.action({
		type: 'script:change:targets',
		payload: {
			id: 'LOCAL_SCRIPT_0',
			targets: [
				{
					type: 'layer',
					id: 'LOCAL_LAYER_2',
				},
			],
		},
	})
	m.action({
		type: 'script:change:targets',
		payload: {
			id: 'LOCAL_SCRIPT_0',
			targets: [
				{
					type: 'stage',
					id: 'LOCAL_STAGE_MAIN',
				},
			],
		},
	})

	console.log('should warn:')
	m.action({
		type: 'script:change:targets',
		payload: {
			id: 'LOCAL_SCRIPT_0',
			targets: [],
		},
	})
})
