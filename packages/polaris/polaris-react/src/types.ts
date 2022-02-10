import { PickEventResult } from '@polaris.gl/base'
import { PolarisGSI, PolarisGSIProps } from '@polaris.gl/gsi'
import { StandardLayer, StandardLayerProps } from '@polaris.gl/layer-std'

// ========================
// Types: Polaris
// ========================

type PolarisGSICtor = new (props: PolarisGSIProps) => PolarisGSI

export interface PolarisProps extends PolarisGSIProps {
	/**
	 * Constructor of any subclass of PolarisGSI
	 */
	polarisClass: PolarisGSICtor

	getPolarisInstance?: (polarisInstance: PolarisGSI) => void

	[prop: string]: any
}

export class PolarisState {
	polarisInstance: PolarisGSI | null = null
	width = 500
	height = 500
	center = [0, 0]
	zoom = 14
	pitch = Math.PI * 0.25
	rotation = 0
}

// ========================
// Types: Layer
// ========================

type LayerCtor = new (props: StandardLayerProps) => StandardLayer

export interface LayerProps extends StandardLayerProps {
	/**
	 * The Polaris instance passed from PolarisReact parent component
	 * @ATTENTION DO NOT USE THIS PROP UNLESS YOU WERE TOLD TO DO SO
	 */
	polarisInstance?: PolarisGSI

	/**
	 * Constructor of any subclass of StandardLayer
	 */
	layerClass: LayerCtor

	getLayerInstance?: (layerInstance: StandardLayer) => void

	[prop: string]: any
}

export class DefaultLayerProps implements LayerProps {
	layerClass: typeof StandardLayer

	depthTest: false

	renderOrder: 0

	pickable: false
}

export class LayerState {
	layerInstance: StandardLayer | null = null
}
