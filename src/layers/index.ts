/**
 * !!!! DO NOT EDIT THIS !!!!
 * @generated
 */

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

// pragma: BP_GEN STAGE_LAYERS_IMPORT START
import { createRuntimeWidgetLayer } from './RuntimeWidgetLayer'
import { createGridLayer } from './GridLayer'
import { createBillboardsLayer } from './BillboardsLayer'
import { createModelLayer } from './ModelLayer'
// pragma: BP_GEN STAGE_LAYERS_IMPORT END

// pragma: BP_GEN STAGE_LAYERS_EXPORT START
export const LAYERS = {
	RuntimeWidgetLayer: {
		factory: createRuntimeWidgetLayer,
		propsDescription: [] as PropDescription[],
	},
	GridLayer: {
		factory: createGridLayer,
		propsDescription: [] as PropDescription[],
	},
	BillboardsLayer: {
		factory: createBillboardsLayer,
		propsDescription: [] as PropDescription[],
	},
	ModelLayer: {
		factory: createModelLayer,
		propsDescription: [] as PropDescription[],
	},
} as const
// pragma: BP_GEN STAGE_LAYERS_EXPORT END

type LayerClassName = keyof typeof LAYERS

/**
 * Create a layer instance by class name and constructor props
 * @param {LayerClassName} type  Layer Class Name
 * @param props
 * @returns
 */
export function createLayer<TType extends LayerClassName>(
	type: TType,
	props: Parameters<typeof LAYERS[TType]['factory']>[0]
): ReturnType<typeof LAYERS[TType]['factory']> {
	const factory = LAYERS[type].factory as typeof LAYERS[TType]['factory']

	if (!factory) throw new Error(`Cannot find layer type: ${name}.`)

	return factory(props as any) as ReturnType<typeof LAYERS[TType]['factory']>
}

interface PropDescription {
	key: string
	type: 'string' | 'boolean' | 'number' | 'color' | 'vec3' | 'number[]'
	defaultValue?: any
	mutable?: boolean
	info?: string
	name?: string
	// needsRefresh: boolean,
}
