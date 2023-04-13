/**
 * Layer Props related utils
 */
import type { PropDescription, PropType } from '../schema/meta'
import type { PropTypeMap } from '../schema/meta'

/**
 * 检查、整理 Props
 * - 检查格式和边界，如果不正确，则 throw Error
 * - 补全默认值
 */
export function parseProps<T extends readonly PropDescription[]>(props: any, descriptions: T) {
	// 找出 props 中多出来，descriptions 中不存在的字段
	// @TODO: 放行 polaris layer 接口标准字段，其他字段丢弃
	const unknownProps = Object.keys(props).filter(
		(key) => !descriptions.find((desc) => desc.key === key)
	)
	// for (const key of unknownProps) {
	// 	console.warn(`Unknown prop: ${key}, will not be included in parsed props.`)
	// }

	const parsedProps = {} as DescToParsedType<T>

	// copy unknown props
	for (const key of unknownProps) {
		parsedProps[key] = props[key]
	}

	for (const desc of descriptions) {
		parsedProps[desc.key] = parseProp(props[desc.key], desc)
	}

	return parsedProps
}

/**
 * 根据 Prop Description 检查、补全 一个 Prop
 * - 检查格式和边界，如果不正确，则 throw Error
 * - 补全默认值
 */
export function parseProp(prop: any, desc: PropDescription) {
	// 检查必需性、默认值
	if (prop === undefined) {
		// @todo 要不要加个字段表明是否必需？
		if (desc.defaultValue === undefined) throw new Error(`Prop ${desc.key} is required`)

		// 如果使用默认值，就跳过类型检查
		return desc.defaultValue
	}

	// 检查类型是否正确
	if (!checkType(prop, desc.type))
		throw new Error(`Prop ${desc.key} (type: ${typeof prop}) does not match desc type ${desc.type}`)

	// 检查边界是否正确
	if (!checkRange(prop, desc))
		throw new Error(
			`Prop ${desc.key} (value: ${prop}) does not match desc range ${JSON.stringify(desc.range)}`
		)

	return prop
}

/**
 * 检查一个 prop 的类型
 */
function checkType(value: any, type: PropType) {
	if (type === 'any') return true
	if (type === 'string') return typeof value === 'string'
	if (type === 'boolean') return typeof value === 'boolean'
	if (type === 'number') return typeof value === 'number'

	if (type === 'vec2')
		return typeof value === 'object' && value.x !== undefined && value.y !== undefined

	if (type === 'vec3')
		return (
			typeof value === 'object' &&
			value.x !== undefined &&
			value.y !== undefined &&
			value.z !== undefined
		)

	if (type === 'vec4')
		return (
			typeof value === 'object' &&
			value.x !== undefined &&
			value.y !== undefined &&
			value.z !== undefined &&
			value.w !== undefined
		)

	if (type === 'color')
		return (
			typeof value === 'string' ||
			(typeof value === 'object' &&
				value.r !== undefined &&
				value.g !== undefined &&
				value.b !== undefined)
		)

	if (type === 'data') return typeof value === 'object'

	throw new Error(`Unknown prop type: ${type}`)
}

/**
 * 检查一个 prop 的边界
 */
function checkRange(value: any, desc: PropDescription) {
	if (!desc.range) return true

	// check usage of Infinity.
	// @note Infinity will break json
	const numbers = [] as number[]
	if (typeof desc.range.max === 'object') {
		numbers.push(...Object.values(desc.range.max))
	} else {
		numbers.push(desc.range.max ?? 0)
	}
	if (typeof desc.range.min === 'object') {
		numbers.push(...Object.values(desc.range.min))
	} else {
		numbers.push(desc.range.min ?? 0)
	}

	if (numbers.some((n) => !Number.isFinite(n)))
		throw new Error(`Prop ${desc.key} range should not use Infinity. It will break JSON.`)

	if (desc.type === 'number') {
		if (desc.range.min !== undefined && value < desc.range.min) return false
		if (desc.range.max !== undefined && value > desc.range.max) return false
	}

	if (desc.type === 'vec2') {
		const minX = typeof desc.range.min === 'object' ? desc.range.min.x : desc.range.min
		const minY = typeof desc.range.min === 'object' ? desc.range.min.y : desc.range.min
		const maxX = typeof desc.range.max === 'object' ? desc.range.max.x : desc.range.max
		const maxY = typeof desc.range.max === 'object' ? desc.range.max.y : desc.range.max

		if (minX !== undefined && value.x < minX) return false
		if (minY !== undefined && value.y < minY) return false
		if (maxX !== undefined && value.x > maxX) return false
		if (maxY !== undefined && value.y > maxY) return false
	}

	if (desc.type === 'vec3') {
		const minX = typeof desc.range.min === 'object' ? desc.range.min.x : desc.range.min
		const minY = typeof desc.range.min === 'object' ? desc.range.min.y : desc.range.min
		const minZ = typeof desc.range.min === 'object' ? desc.range.min.z : desc.range.min
		const maxX = typeof desc.range.max === 'object' ? desc.range.max.x : desc.range.max
		const maxY = typeof desc.range.max === 'object' ? desc.range.max.y : desc.range.max
		const maxZ = typeof desc.range.max === 'object' ? desc.range.max.z : desc.range.max

		if (minX !== undefined && value.x < minX) return false
		if (minY !== undefined && value.y < minY) return false
		if (minZ !== undefined && value.z < minZ) return false
		if (maxX !== undefined && value.x > maxX) return false
		if (maxY !== undefined && value.y > maxY) return false
		if (maxZ !== undefined && value.z > maxZ) return false
	}

	if (desc.type === 'vec4') {
		const minX = typeof desc.range.min === 'object' ? desc.range.min.x : desc.range.min
		const minY = typeof desc.range.min === 'object' ? desc.range.min.y : desc.range.min
		const minZ = typeof desc.range.min === 'object' ? desc.range.min.z : desc.range.min
		const minW = typeof desc.range.min === 'object' ? desc.range.min.w : desc.range.min
		const maxX = typeof desc.range.max === 'object' ? desc.range.max.x : desc.range.max
		const maxY = typeof desc.range.max === 'object' ? desc.range.max.y : desc.range.max
		const maxZ = typeof desc.range.max === 'object' ? desc.range.max.z : desc.range.max
		const maxW = typeof desc.range.max === 'object' ? desc.range.max.w : desc.range.max

		if (minX !== undefined && value.x < minX) return false
		if (minY !== undefined && value.y < minY) return false
		if (minZ !== undefined && value.z < minZ) return false
		if (minW !== undefined && value.w < minW) return false
		if (maxX !== undefined && value.x > maxX) return false
		if (maxY !== undefined && value.y > maxY) return false
		if (maxZ !== undefined && value.z > maxZ) return false
		if (maxW !== undefined && value.w > maxW) return false
	}

	return true
}

/**
 * Get the typescript type of a prop type
 */
type TsType<T extends PropType> = PropTypeMap[T]

/**
 * Convert a prop descriptions array to a props interface
 * - 把一个 PropDescription 数组转换成一个 Props 接口
 * - @note 所有字段都会变成必选的
 */
export type DescToParsedType<T extends readonly PropDescription[]> = {
	[Desc in T[number] as Desc['key']]: TsType<Desc['type']>
}

// export type DescToType<T extends readonly PropDescription[]> = DescToTypeOptional<T> &
// 	DescToTypeRequired<T>

// @note 这样写是没必要的，但是如果不这样写，typescript 的 代码提示不会 resolve 泛型

/**
 * Convert a prop descriptions array to a props interface
 * - 把一个 PropDescription 数组转换成一个 Props 接口
 * - @note 会区分的可选字段和必选字段
 */
export type DescToType<T extends readonly PropDescription[]> = {
	[key in keyof DescToTypeOptional<T>]?: DescToTypeOptional<T>[key]
} & {
	[key in keyof DescToTypeRequired<T>]: DescToTypeRequired<T>[key]
}

/**
 * 提取可选字段
 */
export type DescToTypeOptional<T extends readonly PropDescription[]> = {
	[Desc in T[number] as Desc extends { defaultValue: any } ? Desc['key'] : never]: TsType<
		Desc['type']
	>
}

/**
 * 提取必选字段
 */
export type DescToTypeRequired<T extends readonly PropDescription[]> = {
	[Desc in T[number] as Desc extends { defaultValue: any } ? never : Desc['key']]: TsType<
		Desc['type']
	>
}

/**
 * 提取可变字段
 */
export type DescToTypeMutable<T extends readonly PropDescription[]> = {
	[Desc in T[number] as Desc extends { mutable: true } ? Desc['key'] : never]: TsType<Desc['type']>
}
