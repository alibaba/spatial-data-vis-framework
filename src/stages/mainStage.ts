import { StageBase, LayerList } from '../private/base/StageBase'
import { MercatorProjection, Projection } from '@polaris.gl/projection'

// @TODO: 这部分依赖怎么处理？生成还是全部提前写好？
import { GridLayer } from '../layers/GridLayer'

const layerProps = {
	// pragma: BP_GEN STAGE_LAYER_PROPS START
	LOCAL_LAYER_0: {
		width: 1000000,
		height: 1000000,
		lineWidth: 1000,
		opacity: 0.5,
		depthTest: false,
		depthWrite: false,
		renderOrder: -10000,
	},
	// pragma: BP_GEN STAGE_LAYER_PROPS END
}

const layers = [
	// pragma: BP_GEN STAGE_LAYERS START
	{
		name: 'Grid', // optional
		id: 'LOCAL_LAYER_0',
		layer: new GridLayer(layerProps['LOCAL_LAYER_0']),
	},
	// pragma: BP_GEN STAGE_LAYERS END
] as const

// 可选的分中心投影，默认继承 polaris
// pragma: BP_GEN STAGE_PROJECTION START
const projection = undefined as Projection | undefined
// pragma: BP_GEN STAGE_PROJECTION END

const mainStage = new StageBase({
	projection,
	layers,
	name: 'MainStage',
	id: 'LOCAL_STAGE_MAIN',
})

export default mainStage
