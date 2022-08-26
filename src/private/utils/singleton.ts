if (globalThis.__polaris_singleton) {
	console.error(
		'There are more than one singleton.ts in this project. \
		Singleton check will not work properly.'
	)
	globalThis.__polaris_singleton++
} else {
	globalThis.__polaris_singleton = 1
}

const ClassCache = new WeakSet<Function>()

/**
 * throw if this class is instanced more than once.
 * @usage
 * ```javascript
 * class SingletonClass {
 * 		constructor(){
 *	 		// ...
 * 			checkSingleton(this)
 * 		}
 * }
 * ```
 */
export function checkSingleton(instance: object, shouldThrow = false) {
	const constructor = instance.constructor

	if (ClassCache.has(constructor)) {
		const msg = `checkSingleton: ${constructor.name} is already instanced.`
		if (shouldThrow) {
			throw new Error(msg)
		} else {
			console.error(msg)
		}
	} else {
		ClassCache.add(constructor)
	}
}
