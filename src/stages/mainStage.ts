/**
 * !!!! DO NOT EDIT THIS !!!!
 * @generated
 */

import { StageBase, LayerList } from '../private/base/StageBase'
import { MercatorProjection, Projection } from '@polaris.gl/projection'
import { layerProps } from '../config/layerProps'

// @TODO: 这部分依赖怎么处理？生成还是全部提前写好？
// - plan A
//	- 把所有内部依赖和用户自定义layer全部import，留给 bundler 做 tree-shaking，不需要出码阶段做筛选
import { GridLayer } from '../layers/GridLayer'
import { createModelLayer } from '../layers/ModelLayer/ModelLayer'
import { createBillboardsLayer } from '../layers/BillboardsLayer'

const layers = [
	// pragma: BP_GEN STAGE_LAYERS START
	{
		name: 'helper grid', // optional
		id: 'LOCAL_LAYER_0',
		layer: new GridLayer(layerProps.LOCAL_LAYER_0),
	},
	{
		name: 'model', // optional
		id: 'LOCAL_LAYER_1',
		layer: createModelLayer(layerProps.LOCAL_LAYER_1),
	},
	{
		name: 'sparkles',
		id: 'LOCAL_LAYER_2',
		layer: createBillboardsLayer(layerProps.LOCAL_LAYER_2),
	},
	// pragma: BP_GEN STAGE_LAYERS END
] as const

// 可选的分中心投影，默认继承 polaris
// @TODO: 可以简化为config，不用出码
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
