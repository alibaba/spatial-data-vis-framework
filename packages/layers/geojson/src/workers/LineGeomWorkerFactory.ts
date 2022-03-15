import GeomWorker from 'web-worker:./LineGeomWorker' // rollup worker

// export default GeomWorker

export function createWorkers(count: number) {
	const result = [] as Worker[]
	for (let i = 0; i < count; i++) {
		// const worker = new Worker(new URL('./LineGeomWorker.js', import.meta.url)) // standard worker
		const worker = new GeomWorker()
		result.push(worker)
	}
	return result
}
