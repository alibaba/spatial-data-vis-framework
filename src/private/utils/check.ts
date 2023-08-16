/**
 * check if objects have different ids
 * @param objects
 * @param shouldThrow
 * @returns
 */
export function checkIDs(objects: { id: string }[], shouldThrow = true) {
	if (objects.length === 0) return

	const ids = objects.map((o) => o.id)

	ids.sort()

	if (ids.length < 2) return

	let last = ids[0]
	for (let i = 1; i < ids.length; i++) {
		const curr = ids[i]

		if (curr === last) {
			const msg = 'Duplicate ID: ' + curr
			if (shouldThrow) throw new Error(msg)
			console.error(msg)
		} else {
			last = curr
		}
	}
}
