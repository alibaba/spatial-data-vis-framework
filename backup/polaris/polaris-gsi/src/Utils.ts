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
