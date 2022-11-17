import type { Projection } from '@polaris.gl/projection'
import type { PolarisThreeProps } from '@polaris.gl/three'

// L0

export type AppConfig<TLayerClasses extends LayerClassesShape = any> = BaseConfig & {
	layers: LayersConfig<TLayerClasses>
	stages: StagesConfig
	scenes: ScenesConfig
}

export interface BaseConfig {
	version: '0.0.1'
	app: AppPolarisConfig
}

// L1

/**
 * Basic App Config (Supported Polaris Props)
 */
export type AppPolarisConfig = Pick<
	PolarisThreeProps,
	| 'width'
	| 'height'
	| 'antialias'
	| 'fov'
	| 'background'
	| 'autoResize'
	| 'enablePointer'
	| 'asyncRendering'
	| 'pitchLimit'
	| 'debug'
>

export type LayersConfig<TLayerClasses extends LayerClassesShape> = LayerConfig<TLayerClasses>[]

export type StagesConfig = StageConfig[]

export type ScenesConfig = SceneConfig[]

// L2

export type LayerConfig<
	TLayerClasses extends LayerClassesShape = any,
	TLayerClassName extends keyof TLayerClasses = any
> = {
	name: string
	id: string
	class: TLayerClassName
	props: TLayerClasses[TLayerClassName]['propsDescription']
}

export type StageConfig = {
	name: string
	id: string
	layers: string[]
	projection?: string
}

export type SceneConfig = {
	name: string
	id: string
	stage: string
	cameraStateCode: string
	layers: string[]
}

// Dependents

/**
 * All Layer Classes Supported by the App
 */
export type LayerClassesShape = {
	[LayerClassName: string]: {
		factory: (props: any) => any
		propsDescription: PropDescription[]
	}
}

/**
 * Layer Prop Description
 */
export interface PropDescription {
	/**
	 * key of this value
	 */
	key: string
	/**
	 * type if this value
	 */
	type: 'string' | 'boolean' | 'number' | 'color' | 'vec3' | 'array<number>'

	/**
	 * default value of this value
	 */
	defaultValue?: any

	/**
	 * if this value can be changed without recreating this layer
	 */
	mutable?: boolean

	/**
	 * text to show in the UI
	 */
	info?: string

	/**
	 * friendly name to show in the UI
	 */
	name?: string
}
