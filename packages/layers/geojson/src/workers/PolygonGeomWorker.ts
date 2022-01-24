// import GeomWorker from 'worker-loader!./PolygonGeom' // webpack worker
// import GeomWorker from 'web-worker:./PolygonGeom' // rollup worker

// export default GeomWorker

export function createWorkers(count: number) {
	const result = [] as Worker[]
	for (let i = 0; i < count; i++) {
		const worker = new Worker(new URL('./PolygonGeom.js', import.meta.url)) // standard worker
		// const worker = new GeomWorker()
		result.push(worker)
	}
	return result
}
