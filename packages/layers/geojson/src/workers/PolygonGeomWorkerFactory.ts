// import GeomWorker from 'worker-loader!./PolygonGeomWorker' // webpack worker
import GeomWorker from 'web-worker:./PolygonGeomWorker' // rollup worker

// export default GeomWorker

export function createWorkers(count: number) {
	const result = [] as Worker[]
	for (let i = 0; i < count; i++) {
		// const worker = new Worker(new URL('./PolygonGeomWorker.js', import.meta.url)) // standard worker
		const worker = new GeomWorker()
		result.push(worker)
	}
	return result
}
