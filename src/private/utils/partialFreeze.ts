/**
 * freeze certain properties of an object
 * @note throw error when set a frozen property
 * @note if keys is not provided, all existing properties will be frozen
 */
export function partialFreeze<T extends Record<string, any>, K extends keyof T>(
	obj: T,
	keys?: K[]
) {
	if (keys === undefined) {
		keys = Object.keys(obj) as K[]
	}

	for (const key of keys) {
		const value = obj[key]
		Object.defineProperty(obj, key, {
			configurable: false,
			enumerable: true,
			get() {
				return value
			},
			set(v) {
				throw new Error(`cannot set property ${key.toString()} of ${obj}`)
			},
		})
	}

	return obj as Readonly<Pick<T, K>> & Omit<T, K>
}
