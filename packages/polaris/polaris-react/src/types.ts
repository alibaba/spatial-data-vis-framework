import { PickEventResult } from '@polaris.gl/base'
import { PolarisGSI, PolarisGSIProps } from '@polaris.gl/gsi'
import { StandardLayer, StandardLayerProps } from '@polaris.gl/layer-std'

// ========================
// Polaris types
// ========================

type PolarisGSICtor = new (props: PolarisGSIProps) => PolarisGSI

export interface TPolarisProps extends PolarisGSIProps {
	/**
	 * Any subclass' constructor of PolarisGSI
	 */
	PolarisClass?: PolarisGSICtor

	width: number

	height: number
}

export class PolarisProps implements TPolarisProps {
	width: 500

	height: 500
}

export class PolarisState {
	polarisInstance: PolarisGSI | null = null
}

// ========================
// Layer types
// ========================

type LayerCtor = new (props: StandardLayerProps) => StandardLayer

export interface TLayerProps extends StandardLayerProps {
	/**
	 * The Polaris instance passed from PolarisReact parent component
	 * @NOTE DO NOT USE THIS PROP UNLESS YOU WERE TOLD TO DO SO
	 */
	polarisInstance?: PolarisGSI

	/**
	 * Any subclass' constructor of StandardLayer
	 */
	LayerClass?: LayerCtor

	depthTest?: boolean

	renderOrder?: number

	pickable?: boolean

	onPicked?: (event: PickEventResult | undefined) => void

	onHovered?: (event: PickEventResult | undefined) => void

	[name: string]: any
}

export class LayerProps implements TLayerProps {
	depthTest: false

	renderOrder: 0

	pickable: false
}

export class LayerState {
	layerInstance: StandardLayer | null = null
}
