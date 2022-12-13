/**
 * 生成本地唯一ID
 * @note 如果生成的 ID 用于硬编码放进配置项，则必须全部硬编码，该生成函数只能用于出码。
 * @warning 不可混用运行时生成的ID和硬编码ID
 *
 * @naming
 * - LOCAL_1001 本地唯一编号
 * - LOCAL_TYPE_001
 * - RES_xxx 预留id
 */

/**
 * generate a local unique ID.
 * @note If a object is given, the id will be cached
 */
export function getID(o?: object): string {
	if (!o) return `LOCAL_${currID++}`

	if (IDMap.has(o)) return IDMap.get(o) as string

	const id = `LOCAL_${currID++}`
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

	const id = `LOCAL_${namespace}_${space.currID++}`
	space.IDMap.set(o, id)
	return id
}

const namespaces = {} as {
	[namespace: string]: {
		currID: number
		IDMap: WeakMap<object, string>
	}
}

/**
 * 占用一个 ID，如果一个ID调用该函数两次，则不通过
 * @note 该占用行为是代码生命周期的，不应该在 app 生命周期中调用，否则 app 将只能创建一次
 */
export function occupyStaticID<TID extends string | undefined>(id: TID, shouldThrow = false) {
	if (id) {
		if (StaticIDCache.has(id)) {
			const msg = `id: ${id} is already used.`
			if (shouldThrow) {
				throw new Error(msg)
			} else {
				console.error(msg)
			}
		} else {
			StaticIDCache.add(id)
		}
	}

	return id
}

const StaticIDCache = new Set<string>()

/**
 * 占用一个 ID，如果一个ID调用该函数两次，则不通过
 * @note 该占用行为生命周期为 scope 生命周期的
 */
export function occupyID<TID extends string | undefined>(
	scope: object,
	id: TID,
	shouldThrow = false
) {
	let idCache = ScopedIDCache.get(scope)

	if (!idCache) {
		idCache = new Set<string>()
		ScopedIDCache.set(scope, idCache)
	}

	if (id) {
		if (idCache.has(id)) {
			const msg = `id: ${id} is already used.`
			if (shouldThrow) {
				throw new Error(msg)
			} else {
				console.error(msg)
			}
		} else {
			idCache.add(id)
		}
	}

	return id
}

const ScopedIDCache = new WeakMap<object, Set<string>>() // new Set<string>()
