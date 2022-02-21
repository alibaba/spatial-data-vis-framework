import { default as isEqual } from 'lodash/isEqual'

/**
 * get changed props keys
 * @note using deep-diff algorithm, objects and arrays will be deep-diff
 * @note only check added and changed keys, not deleted keys
 */
export function deepDiffProps<TPropsType extends Record<string, any>>(
	newProps: Partial<TPropsType>,
	oldProps: Partial<TPropsType>
): Array<keyof TPropsType> {
	const changedKeys: Array<string> = []

	const keys = Object.keys(newProps)
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i]
		if (!isEqual(newProps[key], oldProps[key])) {
			changedKeys.push(key)
		}
	}

	return changedKeys
}

/**
 * From obj, pick a set of properties whose keys are in the array keys
 * @note just like typescript utility type Pick
 */
export function pick<TObj extends Record<string, any>, TKeys extends Array<keyof TObj>>(
	obj: TObj,
	keys: TKeys
): Pick<TObj, TKeys[number]> {
	const result = {} as Pick<TObj, TKeys[number]>
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i]
		if (Reflect.has(obj, key)) {
			result[key] = obj[key]
		}
	}

	return result
}
