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
	 * @default null
	 */
	defaultValue?: any

	/**
	 * if this value can be changed without recreating this layer
	 * - true: will call .setProps({[key]: newValue})
	 * - false: will dispose this layer and create a new one with new props
	 * @default false
	 */
	mutable?: boolean

	/**
	 * valid range of this value
	 */
	range?: {
		min: number | number[] | { x: number; y: number; z?: number; w?: number }
		max: number | number[] | { x: number; y: number; z?: number; w?: number }
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
}

type PropTypeMap = {
	// basic data type
	string: string
	boolean: boolean
	number: number
	any: any

	// internal structure
	color: string | { r: number; g: number; b: number } | [number, number, number]
	vec2: { x: number; y: number } | [number, number]
	vec3: { x: number; y: number; z: number } | [number, number, number]
	vec4: { x: number; y: number; z: number; w: number } | [number, number, number, number]
	texture: object | string

	/**
	 * url string
	 * @experimental
	 */
	url: string

	/**
	 * runtime data
	 * @experimental
	 */
	data: any
}

type PropType = keyof PropTypeMap

type TsType<T extends PropType> = PropTypeMap[T]

export type DescToType<T extends readonly PropDescription[]> = {
	[Desc in T[number] as Desc['key']]: TsType<Desc['type']>
}

/**
 * All Layer Classes Supported by the App
 */
export type LayerClassesShape = {
	[LayerClassName: string]: {
		factory: (props: any) => any
		propsDescription: PropDescription[]
	}
}
