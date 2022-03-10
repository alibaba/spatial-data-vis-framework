import { PickEventResult } from '@polaris.gl/base'
import { PolarisGSI, PolarisGSIProps, StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'

type PolarisGSICtor = new (opts: PolarisGSIProps) => PolarisGSI

export class PolarisProps implements Partial<PolarisGSIProps> {
	/**
	 * Any subclass' constructor of PolarisGSI
	 */
	PolarisClass: PolarisGSICtor

	width: number

	height: number
}

export class PolarisState {
	polarisInstance: PolarisGSI | null = null
}

type LayerCtor = new (opts: StandardLayerProps) => StandardLayer

export class LayerProps implements StandardLayerProps {
	/**
	 * The Polaris instance passed from PolarisReact parent component
	 * @NOTE DO NOT USE THIS PROP UNLESS YOU WERE TOLD TO DO SO
	 */
	polarisInstance?: PolarisGSI

	/**
	 * Any subclass' constructor of StandardLayer
	 */
	LayerClass: LayerCtor

	depthTest?: boolean

	renderOrder?: number

	pickable?: boolean

	onPicked?: (event: PickEventResult | undefined) => void

	onHovered?: (event: PickEventResult | undefined) => void

	// [name: string]: any
}

export class LayerState {
	layerInstance: StandardLayer | null = null
}
