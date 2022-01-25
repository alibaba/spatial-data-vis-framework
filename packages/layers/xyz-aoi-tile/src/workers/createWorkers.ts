export function createWorkers(count: number) {
	const result = [] as Worker[]
	for (let i = 0; i < count; i++) {
		const worker = new Worker(new URL('./GeomWorker.js', import.meta.url))
		result.push(worker)
	}
	return result
}
