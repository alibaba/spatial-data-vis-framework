declare module 'web-worker:*' {
	const WorkerCtor: new () => Worker
	export default WorkerCtor
}
