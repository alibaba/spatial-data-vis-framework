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
