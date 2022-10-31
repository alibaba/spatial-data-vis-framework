import type { Projection } from '@polaris.gl/projection'

/**
 * AppConfig Schema Definition
 */
export interface AppConfig<TLayerConfig extends LayerBaseConfig> {
	layers: readonly TLayerConfig[]
	stages: readonly StageConfig<TLayerConfig['id']>[]
	scenes: readonly SceneConfig<TLayerConfig['id'], this['stages'][number]['id']>[]
}

type StageConfig<TLayerID extends string> = {
	name: string
	readonly id: string
	layers: readonly TLayerID[]
	projection?: Projection
}

type SceneConfig<TLayerID extends string, TStageID extends string> = {
	name: string
	readonly id: string
	stage: TStageID
	cameraStateCode: string
	layers: readonly (TLayerID | '*')[]
	projection?: Projection
}

type LayerBaseConfig = {
	name: string
	readonly id: string
	readonly class: string
	props: any
}

// @test
// import { BPConfig } from '../../config/template'
// const c = BPConfig as AppConfig<typeof BPConfig['layers'][number]>

// const s = c.stages[0]
