/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { patchPreReturnedMessage } from '@polaris.gl/utils-worker-manager'
import { createFromDesc } from '@polaris.gl/projection'
import { getFeatureTriangles } from '../utils'

const _self: Worker = self as any

/**
 * Message receiver
 */
_self.addEventListener('message', (e) => {
	const info = e.data
	const result: any = {}
	switch (info.task) {
		case 'getFeatureTriangles': {
			const feature = info.feature
			const projectionDesc = info.projectionDesc
			const projection = createFromDesc(projectionDesc)
			const baseAlt = info.baseAlt
			const { positions, indices } = getFeatureTriangles(feature, projection, baseAlt)
			result.data = { positions, indices }
			result.transferables = [positions.buffer, indices.buffer]
			break
		}
		default:
			console.error(`Polaris::AOILayer - Invalid worker task: ${info.task}`)
			postMessage(patchPreReturnedMessage(e, { error: `Invalid worker task: ${info.task}` }))
			return
	}
	patchPreReturnedMessage(e, result.data)
	postMessage(result.data, result.transferables)
})

_self.addEventListener('error', (e) => {
	throw new Error(e.message)
})
