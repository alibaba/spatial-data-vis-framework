import GeomWorker from 'web-worker:./GeomWorker' // rollup worker

export function createWorkers(count: number) {
	const result = [] as Worker[]
	for (let i = 0; i < count; i++) {
		const worker = new GeomWorker()
		result.push(worker)
	}
	return result
}
