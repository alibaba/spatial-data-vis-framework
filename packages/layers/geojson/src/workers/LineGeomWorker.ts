// import GeomWorker from 'web-worker:./LineGeom' // rollup worker

// export default GeomWorker

export function createWorkers(count: number) {
	const result = [] as Worker[]
	for (let i = 0; i < count; i++) {
		const worker = new Worker(new URL('./LineGeom.js', import.meta.url)) // standard worker
		// const worker = new GeomWorker()
		result.push(worker)
	}
	return result
}
