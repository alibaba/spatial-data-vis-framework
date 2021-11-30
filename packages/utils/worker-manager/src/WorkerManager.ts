/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

const WORKER_ID_KEY = '__worker_manager_task_id__'

export function patchPreReturnedMessage(inputMessageFromMainThread: MessageEvent, outputData: any) {
	const inputData: TaskData = inputMessageFromMainThread.data
	if (inputData[WORKER_ID_KEY] === undefined || inputData[WORKER_ID_KEY] === null) {
		throw new Error(
			`Polaris::WorkerManager - missing '${WORKER_ID_KEY}' property, check input message. `
		)
	}
	outputData[WORKER_ID_KEY] = inputData[WORKER_ID_KEY]
	return outputData
}

export class WorkerManager {
	/**
	 * Worker instances
	 */
	private _workers: WorkerWrapper[] = []

	/**
	 * Map to store promise callbacks
	 */
	private _callbackMap = new Map<number, TaskCallbacks>()

	/**
	 * Task id count
	 */
	private _currTaskId = 0

	constructor(workers: Worker[]) {
		this._callbackMap = new Map()
		this._initWorkers(workers)
	}

	execute(task: Task) {
		const workerWrapper = this._workers[0]
		const worker = workerWrapper.worker
		return new Promise<any>((resolve, reject) => {
			task.data[WORKER_ID_KEY] = this._currTaskId
			// Count on task id
			this._currTaskId++
			// Post message to worker
			worker.postMessage(task.data, task.transferables ?? [])
			// Cache callbacks
			this._callbackMap.set(task.data[WORKER_ID_KEY] as number, { resolve, reject })
			// Count on activeTasks
			workerWrapper.activeTasks++
			// Sort workers by `activeTasks` from low to high
			this._workers.sort((a, b) => a.activeTasks - b.activeTasks)
		})
	}

	dispose() {
		this._workers.forEach((wrapper) => {
			wrapper.worker.terminate()
			wrapper.activeTasks = 0
		})
		this._callbackMap.clear()
	}

	private _initWorkers(workers: Worker[]) {
		workers.forEach((worker) => {
			worker.onmessage = (e) => {
				const id = e.data[WORKER_ID_KEY]
				if (id === undefined) {
					console.error(
						`Polaris::WorkerManager - '${WORKER_ID_KEY}' property lost in the returned message: `,
						e.data,
						e
					)
					return
				}
				const callbacks = this._callbackMap.get(id)
				if (!callbacks) {
					console.error(
						`Polaris::WorkerManager - id: ${id} callbacks lost, this may be caused by disposing or other unexpected usage. `
					)
					return
				}
				if (e.data.error) {
					callbacks.reject(e.data)
					this._callbackMap.delete(id)
					return
				}
				callbacks.resolve(e.data)
				this._callbackMap.delete(id)
			}
			worker.onmessageerror = (e) => {
				const id = e.data[WORKER_ID_KEY]
				if (!id) {
					console.error(
						`Polaris::WorkerManager -  '${WORKER_ID_KEY}' property lost in the returned message: `,
						e.data,
						e
					)
					return
				}
				const callbacks = this._callbackMap.get(id)
				if (!callbacks) {
					console.error(
						`Polaris::WorkerManager - id: ${id} callbacks lost, this may be caused by disposing or other unexpected usage. `
					)
					return
				}
				callbacks.reject(e.data)
				this._callbackMap.delete(id)
			}
			worker.onerror = (e) => {
				console.error(`Polaris::WorkerManager - Worker error: `, e.message, e)
			}
			this._workers.push({
				worker,
				activeTasks: 0,
			})
		})
	}
}

type TaskData = { [WORKER_ID_KEY]?: number; [key: string]: any }

type Task = {
	data: TaskData
	transferables?: any[]
}

type TaskCallbacks = {
	resolve: (value: any) => void
	reject: (value: any) => void
}

type WorkerWrapper = {
	worker: Worker
	activeTasks: number
}
