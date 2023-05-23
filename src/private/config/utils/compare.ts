import type { ScriptConfig } from '../../schema/scripts'

/**
 * deep compare two objects/arrays
 */
export function deepEqual(a: any, b: any): boolean {
	if (a === b) return true

	if (typeof a !== typeof b) return false

	if (typeof a !== 'object') return false

	if (a === null || b === null) return false

	if (Array.isArray(a) !== Array.isArray(b)) return false

	if (Array.isArray(a)) {
		if (a.length !== b.length) return false

		if (a.length > 10_000)
			console.warn('deepEqual: array length > 10_000, performance may be degraded')

		for (let i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) return false
		}

		return true
	}

	const aKeys = Object.keys(a)
	const bKeys = Object.keys(b)

	if (aKeys.length !== bKeys.length) return false

	for (const key of aKeys) {
		if (!bKeys.includes(key)) return false

		if (!deepEqual(a[key], b[key])) return false
	}

	return true
}

/**
 * compare two props.
 * @note only shallow compare 1-level kv pairs.
 * @todo support simple 2-level object like vec3
 */
export function propsEqual(propsA: Record<string, any>, propsB: Record<string, any>): boolean {
	const keysA = Object.keys(propsA)
	const keysB = Object.keys(propsB)

	if (keysA.length !== keysB.length) return false

	for (const key of keysA) {
		if (!keysB.includes(key)) return false

		if (propsA[key] !== propsB[key]) return false
	}

	return true
}

/**
 * compare two props. return the keys with different values.
 * @note return null if equal.
 * @note only shallow compare 1-level kv pairs.
 * @todo support simple 2-level object like vec3
 */
export function propsDiff(
	propsA: Record<string, any>,
	propsB: Record<string, any>
): string[] | null {
	const keysA = Object.keys(propsA)
	const keysB = Object.keys(propsB)

	const keys = new Set([...keysA, ...keysB])

	const diff: string[] = []

	for (const key of keys) {
		const valueA = propsA[key]
		const valueB = propsB[key]

		if (valueA !== valueB) {
			diff.push(key)
		}
	}

	return diff.length ? diff : null
}

/**
 * compare two id arrays
 * (strings without order)
 */
export function idsEqual(a: string[], b: string[]): boolean {
	if (a === b) return true

	if (a.length !== b.length) return false

	const setB = new Set(b)

	for (const item of a) {
		if (!setB.has(item)) return false
	}

	return true
}

/**
 * find keys with different values with deep compare
 */
export function deepDiff(a: Record<any, any>, b: Record<any, any>) {
	const keys = new Set([...Object.keys(a), ...Object.keys(b)])
	const diff: string[] = []
	for (const key of keys) {
		if (!deepEqual(a[key], b[key])) {
			diff.push(key)
		}
	}
	return diff
}

/**
 * script targets equal
 */
export function scriptTargetsEqual(
	a: ScriptConfig['targets'],
	b: ScriptConfig['targets']
): boolean {
	if (a === b) return true

	if (a.length !== b.length) return false

	for (let i = 0; i < a.length; i++) {
		const targetA = a[i]

		const targetB = b.find((target) => {
			return target.type === targetA.type && target.id === targetA.id
		})

		if (!targetB) return false
	}

	return true
}
