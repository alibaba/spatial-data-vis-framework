/**
 * Layer Prop Description
 */
export interface PropDescription {
	/**
	 * key of this prop
	 */
	key: string

	/**
	 * type if this value. used to generate UI.
	 * - "any" means do not generate UI for this value, usually because it's a runtime data input
	 * @todo 既然不希望生成 UI，就不应该写在这里，PropsDesc 不是类的描述，只是UI描述
	 */
	type: PropType

	/**
	 * whether this prop is a data prop.
	 * - data props 从 data stubs 中选择id作为值，真实数据在运行时获取，而非在属性编辑器中直接输入数据
	 * - 这样是为了避免数据直接出现在 config 里，也避免搭建工具对数据接口的依赖
	 * @default false
	 */
	isDataProp?: boolean

	/**
	 * default value of this value
	 * @note When `defaultValue` is not provided. This prop is `required` when creating a instance.
	 * @note_cn 如果不提供改字段，则该 prop 必须在创建 layer 时提供，否则抛错
	 * @recommended 在使用可视化编辑器的环境中，建议总是提供该字段
	 */
	defaultValue?: any

	/**
	 * whether this value can be changed without recreating this layer
	 * - true: will call .setProps({[key]: newValue})
	 * - false: will dispose this layer and create a new one with new props
	 * @default false
	 *
	 * @recommendation
	 * - 如果不关心性能，则不需要考虑这个字段，让 PolarisApp 始终重建Layer即可
	 */
	mutable?: boolean

	/**
	 * valid range of this value
	 * @note do not use Infinity for json safety
	 * @note_cn 请不要使用 Infinity，以免 json stringify 时出错
	 */
	range?: {
		min: number | { x: number; y: number; z?: number; w?: number }
		max: number | { x: number; y: number; z?: number; w?: number }
	}

	/**
	 * friendly name to show in the UI.
	 * if not provided, will use key as the name
	 */
	name?: string

	/**
	 * friendly description to show in the UI
	 * if not provided, will use name as the description
	 */
	info?: string

	/**
	 * extra options for the `editor` or `experimental features`
	 * @experimental
	 * @note all these options have no effect on runtime behavior. can be safely ignored.
	 * @note_cn 所有这些选项都不会影响运行时行为，可以安全忽略
	 */
	$editor?: {
		/**
		 * a more specified type for this prop
		 * @note
		 * - this is used to generate better UI
		 * - does not effect runtime behavior. will not cause type validation
		 * - can be safely ignored
		 * - should pair with `type`
		 * @note_cn 只用于指定更细分的值类型，不影响实际运行，数据类型以 type 字段为准
		 *
		 * type 为 `string` 时，有效类型：
		 * - `json`
		 * - `html`
		 * - `css`
		 * - `curve` 曲线描述
		 * - `projectionDesc` 投影描述
		 * - `geojson` 任意类型的 geojson 地图数据
		 * - `geojson<linestring>`
		 * - `geojson<polygon>`
		 * - `geojson<point>`
		 *
		 * type 为 `vec3` 时，有效类型：
		 * - `lla` 经纬度+海拔描述的地理位置
		 *
		 * type 为 `any` 时，有效类型：
		 * - `json` 使用 json 描述的 js 对象
		 */
		subtype?: string

		/**
		 * 是否使用选择其而非自由编辑器
		 * @note 目前只能配合 `type [string]` 使用
		 */
		options?: readonly { label: string; value: any }[]

		/**
		 * 是否允许编辑器在合理的时候，自动生成默认值，来替代上面指定的 defaultValue
		 * @default false
		 *
		 * @note
		 * - 原则: defaultValue 的稳定性和可预测性，优先于交互的便捷性
		 * - **只应**在用户表达出明显的预期时，才让该功能生效
		 *
		 * @example
		 * - 所见即所得的编辑器中，用户将 Layer 拖放到预览器中时，lla 的默认值可以被替换成视野中心的位置，
		 * - 但是如果用户通过修改配置代码或者点击按钮新增Layer，则应该保留 lla 的原始默认值
		 */
		autoDefaultValue?: boolean
	}
}

/**
 * Map of prop type to its type in typescript
 */
export type PropTypeMap = {
	// basic data type
	string: string
	boolean: boolean
	number: number
	any: any

	// internal structure
	color: string | { r: number; g: number; b: number }
	vec2: { x: number; y: number }
	vec3: { x: number; y: number; z: number }
	vec4: { x: number; y: number; z: number; w: number }

	/**
	 * @deprecated
	 */
	data: any
}

/**
 * All prop types supported by the app
 */
export type PropType = keyof PropTypeMap

export type TsType<T extends PropType> = PropTypeMap[T]

export type DescToType<T extends readonly PropDescription[]> = {
	[Desc in T[number] as Desc['key']]: TsType<Desc['type']>
}

/**
 * All Layer Classes Supported by the App
 */
export type LayerClassesShape = {
	[LayerClassName: string]: {
		factory: (props: any) => any
		propsDescription: readonly PropDescription[]
		info?: Record<string, any>
	}
}

export type AppMeta = {
	layers: LayerClassesShape
}
