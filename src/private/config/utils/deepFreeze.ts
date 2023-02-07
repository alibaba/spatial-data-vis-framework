/**
 * Deep freeze an object
 * @see {@link MDN https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze}
 */
export function deepFreeze<T extends object>(obj: T): T {
	// Retrieve the property names defined on object
	const propNames = Reflect.ownKeys(obj)

	// Freeze properties before freezing self
	for (const name of propNames) {
		const value = obj[name]

		if ((value && typeof value === 'object') || typeof value === 'function') {
			deepFreeze(value)
		}
	}

	return Object.freeze(obj)
}
