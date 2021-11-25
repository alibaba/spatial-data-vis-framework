/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

// import { simplify, importGeoJSON, exportGeoJSON } from '../LineString/mapshaper.js'
import { preBuild, simplify } from 'mapshaper-simplify'

// 创建 this 指针，或者配置 webpack 的 output 的 globalObject 属性
const _self: Worker = self as any

/**
 * Message receiver
 */
_self.addEventListener('message', (e) => {
	const data = e.data
	const id = data.id
	let result: any
	switch (data.task) {
		case 'lods': {
			const geojson = data.geojson
			const percentages = data.percentages
			const dataset = preBuild(geojson)
			const results: any[] = []
			percentages.forEach((percentage) => {
				if (percentage >= 1.0) {
					results.push([{ content: geojson }])
				} else {
					results.push([{ content: simplify(dataset, percentage) }])
				}
			})
			result = {
				data: { results },
				transferables: [],
			}
			break
		}
		default:
			console.error(`Polaris::LineStringLayer - Invalid worker task: ${data.task}`)
			return
	}
	// `id` must be returned in order for WorkerManager to get back message
	result.data.id = id
	postMessage(result.data, result.transferables)
})

_self.addEventListener('error', (e) => {
	throw new Error(e.message)
})
