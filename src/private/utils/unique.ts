/**
 * @file ID 占用管理
 */

/**
 * 占用一个 ID，如果一个ID调用该函数两次，则不通过
 * @note 该占用行为生命周期为 scope 生命周期的
 * @note 如果动态增减 ID，需要使用 freeID 主动释放删除的 ID，不然不能重复使用
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

export function freeID(scope: object, id: string) {
	const idCache = ScopedIDCache.get(scope)

	if (idCache) idCache.delete(id)
}

const ScopedIDCache = new WeakMap<object, Set<string>>() // new Set<string>()
