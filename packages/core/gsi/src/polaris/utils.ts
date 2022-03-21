import { RenderableNode } from '@gs.i/schema-scene'
import { PickEventResult } from '@polaris.gl/base'

/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

export function throttle(milliseconds, fn, context?) {
	const Perf = performance ?? Date
	const limit = milliseconds
	let lastTimeStamp: number
	return function (...args) {
		const timeStamp = Perf.now()
		if (!lastTimeStamp || timeStamp - lastTimeStamp >= limit) {
			lastTimeStamp = timeStamp
			fn.apply(context, args)
		}
	}
}

/**
 * Function to perform sorting of two pick results
 */
export function pickResultSorter(a: PickEventResult, b: PickEventResult): number {
	const meshA = a.object as RenderableNode
	const meshB = b.object as RenderableNode

	if (meshA === undefined || meshB === undefined) {
		return a.distance - b.distance
	}

	if (meshA.material !== undefined && meshB.material !== undefined) {
		const aTransparent =
			meshA.material.alphaMode === 'BLEND' ||
			meshA.material.alphaMode === 'BLEND_ADD' ||
			meshA.material.alphaMode === 'MASK'
		const bTransparent =
			meshB.material.alphaMode === 'BLEND' ||
			meshB.material.alphaMode === 'BLEND_ADD' ||
			meshB.material.alphaMode === 'MASK'

		const depthA = meshA.material.extensions?.EXT_matr_advanced?.depthTest
		const depthB = meshB.material.extensions?.EXT_matr_advanced?.depthTest
		const renderOrderA = meshA.extensions?.EXT_mesh_order?.renderOrder ?? 0
		const renderOrderB = meshB.extensions?.EXT_mesh_order?.renderOrder ?? 0

		// compare transparent
		// transparent object is always rendered after opaque object
		if (aTransparent === true && bTransparent === false) {
			return -1
		} else if (aTransparent === false && bTransparent === true) {
			return 1
		}
		// if both are true, compare renderOrder
		else if (aTransparent === true && bTransparent === true) {
			return renderOrderB - renderOrderA
		}
		// both false transparent
		// compare depthTest
		// if depthTests are true, compare distance
		else if (depthA !== undefined && depthB !== undefined) {
			if (depthA === depthB) {
				// both true
				if (depthA === true) {
					return a.distance - b.distance
				}
				// both false, compare transparency, then compare renderOrders
				else {
					if (aTransparent === true && bTransparent === false) {
						return -1
					} else if (aTransparent === false && bTransparent === true) {
						return 1
					} else {
						return renderOrderB - renderOrderA
					}
				}
			}
			// different depthTest, compare transparency, then compare renderOrders
			else {
				if (aTransparent === true && bTransparent === false) {
					return -1
				} else if (aTransparent === false && bTransparent === true) {
					return 1
				} else {
					return renderOrderB - renderOrderA
				}
			}
		}
		// compare renderOrder
		// lower renderOrder => earlier to render => covered by higher renderOrder
		else if (renderOrderA !== renderOrderB) {
			return renderOrderB - renderOrderA
		}
	}

	return a.distance - b.distance
}
