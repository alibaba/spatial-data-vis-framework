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
 * 能否用decorator集中到一起？
 */

/**
 * Layer类名
 */
type LayerClassName = 'RuntimeWidget' | 'GridLayer' | 'BillboardsLayer' | 'ModelLayer'

// `export * as %{name}Module from ./${name}
import * as RuntimeWidgetLayerModule from './RuntimeWidget'
import * as GridLayerModule from './GridLayer'
import * as BillboardsLayerModule from './BillboardsLayer'
import * as ModelLayerModule from './ModelLayer'

const MODULES = {
	RuntimeWidget: RuntimeWidgetLayerModule,
	GridLayer: GridLayerModule,
	BillboardsLayer: BillboardsLayerModule,
	ModelLayer: ModelLayerModule,
} as const

// @debug
console.debug(MODULES)

/**
 * Create a layer instance by class name and constructor props
 * @param {LayerClassName} type  Layer Class Name
 * @param props
 * @returns
 */
export function createLayer<TType extends LayerClassName>(type: TType, props: any) {
	// export function createLayer(type: LayerClassName, props: any) {
	const module = MODULES[type] as any

	if (!module) throw new Error(`Cannot find layer type: ${name}.`)

	if (module.create) return module.create(props)

	// const creatorHintName = 'create' + type
	// if (module[creatorHintName]) return module[creatorHintName](props)

	// if (module[type]) return new module[type](props)

	throw new Error(`Cannot find a constructor or creator for ${type}.`)
}
