/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { ColorLike } from '@gs.i/schema'

export function clamp(x, minVal, maxVal) {
	return Math.min(Math.max(x, minVal), maxVal)
}

export function smoothstep(edge0, edge1, x) {
	const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0)
	return t * t * (3.0 - 2.0 * t)
}

export const EasingFunction = {
	Exponential_In: (k) => {
		return k === 0 ? 0 : Math.pow(1024, k - 1)
	},
	Exponential_Out: (k) => {
		return k === 1 ? 1 : 1 - Math.pow(2, -10 * k)
	},
	Quadratic_In: (k) => {
		return k * k
	},
	Quadratic_Out: (k) => {
		return k * (2 - k)
	},
	Cubic_In: (k) => {
		return k * k * k
	},
	Cubic_Out: (k) => {
		return --k * k * k + 1
	},
	Quad_InOut(k) {
		return EasingFunction.getPowInOut(4)(k)
	},
	getPowInOut(pow) {
		return function (t) {
			if ((t *= 2) < 1) return 0.5 * Math.pow(t, pow)
			return 1 - 0.5 * Math.abs(Math.pow(2 - t, pow))
		}
	},
}

const colorEpsilon = 1 / 256
export function colorEquals(color: ColorLike, another: ColorLike) {
	if (
		Math.abs(color.r - another.r) < colorEpsilon &&
		Math.abs(color.g - another.g) < colorEpsilon &&
		Math.abs(color.b - another.b) < colorEpsilon
	) {
		return true
	}
	return false
}
