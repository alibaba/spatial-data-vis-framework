/**
 * !!!! DO NOT EDIT THIS !!!!
 * @generated
 */

import type { PropDescription } from '../private/config/schema'

/**
 * 将所有 Layer 类导出
 * @note
 * 如果全部是本地类，可以不做 tree shaking
 * 外部和官方layer要先本地化，然后当作本地layer使用。
 * 总之不在这里考虑 tree shaking。
 * 所有layer的实现代码管理封装在这个文件之下，这个文件的 export 作为 interface
 * @todo
 * 能否用decorator集中到一起？似乎没啥意义，因为模版是生成的，不是用户写的
 */

// pragma: BP_GEN LAYERS_IMPORT START
import { createBillboardsLayer } from './BillboardsLayer'
import { createGridLayer } from './GridLayer'
import { createModelLayer } from './ModelLayer'
import { createRuntimeWidgetLayer } from './RuntimeWidgetLayer'
// pragma: BP_GEN LAYERS_IMPORT END

export const LayerClasses = {
	// pragma: BP_GEN LAYERS_EXPORT START
	// pragma: RuntimeWidgetLayer START
	RuntimeWidgetLayer: {
		factory: createRuntimeWidgetLayer,
		propsDescription: [] as PropDescription[],
	},
	// pragma: RuntimeWidgetLayer END
	// pragma: GridLayer START
	GridLayer: {
		factory: createGridLayer,
		propsDescription: [] as PropDescription[],
	},
	// pragma: GridLayer END
	// pragma: BillboardsLayer START
	BillboardsLayer: {
		factory: createBillboardsLayer,
		propsDescription: [] as PropDescription[],
	},
	// pragma: BillboardsLayer END
	// pragma: ModelLayer START
	ModelLayer: {
		factory: createModelLayer,
		propsDescription: [] as PropDescription[],
	},
	// pragma: ModelLayer END
	// pragma: BP_GEN LAYERS_EXPORT END
} as const
