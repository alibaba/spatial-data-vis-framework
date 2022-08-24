/**
 * 生成本地唯一ID
 * @note 如果生成的 ID 用于硬编码放进配置项，则必须全部硬编码，该生成函数只能用于出码。
 * @warning 不可混用运行时生成的ID和硬编码ID
 */

/**
 * generate a local unique ID.
 * @note If a object is given, the id will be cached
 */
export function getID(o?: object): string {
	if (!o) return `LOCAL_${currID++}`

	if (IDMap.has(o)) return IDMap.get(o) as string

	let id = `LOCAL_${currID++}`
	IDMap.set(o, id)
	return id
}

let currID = 100
const IDMap = new WeakMap<object, string>()

/**
 * generate a local unique ID in the given namespace.
 * @note If a object is given, the id will be cached
 */
export function getNamedID(namespace: string, o?: object): string {
	if (!namespaces[namespace]) {
		namespaces[namespace] = {
			currID: 0,
			IDMap: new WeakMap<object, string>(),
		}
	}

	const space = namespaces[namespace]

	if (!o) return `LOCAL_${namespace}_${space.currID++}`

	if (space.IDMap.has(o)) return space.IDMap.get(o) as string

	let id = `LOCAL_${namespace}_${space.currID++}`
	space.IDMap.set(o, id)
	return id
}

const namespaces = {} as {
	[namespace: string]: {
		currID: number
		IDMap: WeakMap<object, string>
	}
}
