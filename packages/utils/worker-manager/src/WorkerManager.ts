/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

export class WorkerManager {
	/**
	 * worker instances
	 */
	workers: WorkerWrapper[] = []

	/**
	 * map to store promise callbacks
	 */
	callbackMap = new Map<number, TaskCallbacks>()

	/**
	 * Task id count
	 */
	currTaskId = 0

	constructor(workers: Worker[]) {
		this.callbackMap = new Map()
		this._initWorkers(workers)
	}

	execute(task: Task) {
		const workerWrapper = this.workers[0]
		const worker = workerWrapper.worker
		return new Promise<any>((resolve, reject) => {
			task.data.id = this.currTaskId
			// Count on task id
			this.currTaskId++
			// Post message to worker
			worker.postMessage(task.data, task.transferables ?? [])
			// Cache callbacks
			this.callbackMap.set(task.data.id, { resolve, reject })
			// Count on activeTasks
			workerWrapper.activeTasks++
			// Sort workers from low activeTasks to high
			this.workers.sort((a, b) => a.activeTasks - b.activeTasks)
		})
	}

	dispose() {
		this.workers.forEach((wrapper) => {
			wrapper.worker.terminate()
		})
		this.callbackMap.clear()
	}

	private _initWorkers(workers: Worker[]) {
		workers.forEach((worker) => {
			worker.onmessage = (e) => {
				const id = e.data.id
				if (id === undefined) {
					console.error(
						`Polaris::WorkerManager - No id was found in the return message: ${e.data}. `
					)
					return
				}
				const callbacks = this.callbackMap.get(id)
				if (!callbacks) {
					console.error(`Polaris::WorkerManager - id: ${id} callbacks were lost. `)
					return
				}
				if (e.data.error) {
					callbacks.reject(e.data)
					this.callbackMap.delete(id)
					return
				}
				callbacks.resolve(e.data)
				this.callbackMap.delete(id)
			}
			worker.onmessageerror = (e) => {
				const id = e.data.id
				if (!id) {
					console.error(`Polaris::WorkerManager - No id was found in the message: `, e.data)
					return
				}
				const callbacks = this.callbackMap.get(id)
				if (!callbacks) {
					console.error(`Polaris::WorkerManager - id: ${id} callbacks lost.`)
					return
				}
				callbacks.reject(e.data)
				this.callbackMap.delete(id)
			}
			worker.onerror = (e) => {
				console.error(`Polaris::WorkerManager - Worker error ${e.message}`, e)
			}
			this.workers.push({
				worker,
				activeTasks: 0,
			})
		})
	}
}

type Task = {
	data: { id?: number; [key: string]: any }
	transferables?: any[]
}

type TaskCallbacks = {
	resolve: (value: unknown) => void
	reject: (value: unknown) => void
}

type WorkerWrapper = {
	worker: Worker
	activeTasks: number
}
