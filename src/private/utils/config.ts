import type { Projection } from '@polaris.gl/projection'

export function getLayerConfig<
	AppConfig extends { layers: readonly { id: string }[] },
	LayerID extends AppConfig['layers'][number]['id']
>(appConfig: AppConfig, id: LayerID) {
	const layerConfig = appConfig.layers.find((l) => l.id === id)
	if (!layerConfig) {
		console.error(`Can not find layer config by id (${id})`)
		// return null
	}

	return layerConfig as MapByID<AppConfig['layers'][number]>[LayerID]
}

type MapByID<U extends { id: string }> = {
	[I in U['id']]: Extract<U, { id: I }>
}

export function getStageConfig<
	AppConfig extends {
		stages: readonly { id: string; layers: readonly AppConfig['layers'][number]['id'][] }[]
		layers: readonly { id: string }[]
	},
	StageID extends AppConfig['stages'][number]['id']
>(appConfig: AppConfig, id: StageID) {
	const config = appConfig.stages.find((l) => l.id === id)
	if (!config) {
		console.error(`Can not find stage config by id (${id})`)
		// return null
	}

	return config as {
		name: string
		readonly id: StageID
		layers: readonly AppConfig['layers'][number]['id'][]
		projection?: Projection
	}
}

export function getSceneConfig<
	AppConfig extends {
		scenes: readonly {
			id: string
			stage: AppConfig['stages'][number]['id']
			layers: readonly (AppConfig['layers'][number]['id'] | '*')[]
		}[]
		layers: readonly { id: string }[]
		stages: readonly { id: string }[]
	},
	SceneID extends AppConfig['scenes'][number]['id']
>(appConfig: AppConfig, id: SceneID) {
	const layerConfig = appConfig.scenes.find((l) => l.id === id)
	if (!layerConfig) {
		console.error(`Can not find layer config by id (${id})`)
		// return null
	}

	return layerConfig as {
		name: string
		readonly id: SceneID
		cameraStateCode: string
		stage: 'LOCAL_STAGE_MAIN'
		layers: readonly (AppConfig['layers'][number]['id'] | '*')[]
	}
}

// @test
// const a = [
// 	{ id: '1', value: 1 },
// 	{ id: '2', value: 2 },
// ] as const
// type O = MapByID<typeof a[number]>

// @test
// import { BPConfig } from '../../config/template'
// const c = getStageConfig(BPConfig, '')
