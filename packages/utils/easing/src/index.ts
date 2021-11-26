/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

const PI2 = Math.PI * 2
const PI_HALF = Math.PI / 2

// 移植GLSL中的函数
export function clamp(x, min, max) {
	return Math.min(Math.max(x, min), max)
}

// 移植GLSL中的函数
export function smoothstep(e0, e1, x) {
	const t = clamp((x - e0) / (e1 - e0), 0, 1)
	return t * t * (3 - 2 * t)
}

// 缓动函数：sin缓动，0-1-0
export function easeSin010(p) {
	return 0.5 + Math.sin(PI2 * p - PI_HALF) / 2
}

// 缓动函数：sin缓动，0-1-0
export function easeSin101(p) {
	return 0.5 + Math.sin(PI2 * p + PI_HALF) / 2
}

// 缓动函数：sin缓动，0-1-0
export function easeSin101WithPivot(p, pivot) {
	if (p < pivot) {
		return easeSin01(p / pivot)
	} else if (p > pivot) {
		return easeSin10((p - pivot) / (1 - pivot))
	} else {
		// p == 0 或者 p == 1时的特殊处理
		return 1
	}
}

export function easeSin010WithoutInOutWithPivot(p, pivot) {
	if (p < pivot) {
		return easeSin01WithoutIn(p / pivot)
	} else if (p > pivot) {
		return easeSin10WithoutOut((p - pivot) / (1 - pivot))
	} else {
		// p == 0 或者 p == 1时的特殊处理
		return 1
	}
}

// 缓动函数：sin缓动, inOut吴缓动，0-1-0
export function easeSin010WithoutInOut(p) {
	return Math.cos(p * Math.PI - PI_HALF)
}

// 缓动函数：sin缓动, in吴缓动，0-1
export function easeSin01WithoutIn(p) {
	return Math.sin((p * Math.PI) / 2)
}

export function easeSin01WithoutOut(p) {
	return Math.sin((p * Math.PI) / 2 - Math.PI / 2) + 1
}

export function easeSin10WithoutOut(p) {
	return easeSin01WithoutIn(1 - p)
}

// 缓动函数：sin缓动，0-1
export function easeSin01(p) {
	return 0.5 - Math.cos(Math.PI * p) / 2
	// return 0.5 + Math.sin(Math.PI * p - PI_HALF) / 2;
}

// 缓动函数：sin缓动，1-0
export function easeSin10(p) {
	return 0.5 + Math.sin(Math.PI * p + PI_HALF) / 2
}

// // 缓动函数：组合easeInOutCubic，两节阶梯缓动（中间停一下）
// export function ease2StepsInOutCubic(p) {
// 	if (p < 0.5) {
// 		return TWEEN.Easing.Cubic.InOut(p * 2) / 2;
// 	}
// 	return TWEEN.Easing.Cubic.InOut((p - 0.5) * 2) / 2 + 0.5;
// }

// 缓动函数：sin缓动，0-11-0
export function easeSin0110(p, w = 0.0) {
	const btm = 0.5 - w
	const top = 0.5 + w
	if (p < btm) {
		return easeSin01(p / btm)
	} else if (p < top) {
		return 1
	}
	return easeSin01((1 - p) / btm)
}

// tween的缓动
export function quadraticInOut(p) {
	if ((p *= 2) < 1) {
		return 0.5 * p * p
	}
	return -0.5 * (--p * (p - 2) - 1)
}

export function circularInOut(p) {
	if ((p *= 2) < 1) {
		return -0.5 * (Math.sqrt(1 - p * p) - 1)
	}

	return 0.5 * (Math.sqrt(1 - (p -= 2) * p) + 1)
}

export function quinticInOut(p) {
	if ((p *= 2) < 1) {
		return 0.5 * p * p * p * p * p
	}

	return 0.5 * ((p -= 2) * p * p * p * p + 2)
}

// 映射到0-1
export function normalize(value, min, max) {
	if (value < min) return 0
	if (value > max) return 1

	return (value - min) / (max - min)
}

// 二次贝塞尔
export function quadraticBezier(p0, p1, p2, t) {
	const A = p0.clone().multiplyScalar(Math.pow(1 - t, 2))
	const B = p1.clone().multiplyScalar((1 - t) * 2 * t)
	const C = p2.clone().multiplyScalar(Math.pow(t, 2))
	return A.add(B.add(C))
}

export function cubicBezier(p0, p1, p2, p3, t) {
	const A = p0.clone().multiplyScalar(Math.pow(1 - t, 3))
	const B = p1.clone().multiplyScalar((1 - t) * (1 - t) * 3 * t)
	const C = p2.clone().multiplyScalar((1 - t) * 3 * t * t)
	const D = p3.clone().multiplyScalar(Math.pow(t, 3))
	return A.add(B.add(C.add(D)))
}

// const _START = new THREE.Vector2(0, 0)
// const _END = new THREE.Vector2(1, 1)

// export function easeCubicBezierOut(p, pivot) {
// 	const point = cubicBezier(_START, new THREE.Vector2(pivot, 1), new THREE.Vector2(pivot, 1), _END, p)
// 	// console.log(p, point.x, pivot)
// 	return point.y
// }
// export function easeCubicBezierIn(p, pivot) {
// 	const point = cubicBezier(_START, new THREE.Vector2(pivot, 0), new THREE.Vector2(pivot, 0), _END, p)
// 	// console.log(p, point.x, pivot)
// 	return point.y
// }
//
// export function easeQuadBezierOut(p, pivot) {
// 	const point = quadraticBezier(_START, new THREE.Vector2(pivot, 1), _END, p)
// 	// console.log(p, point.x, pivot)
// 	return point.y
// }
// export function easeQuadBezierIn(p, pivot) {
// 	const point = quadraticBezier(_START, new THREE.Vector2(pivot, 0), _END, p)
// 	// console.log(p, point.x, pivot)
// 	return point.y
// }

// const cubicBezierOut = new THREE.CubicBezierCurve(
// 	new THREE.Vector2(0, 0),
// 	new THREE.Vector2(0.95, 1),
// 	new THREE.Vector2(0.95, 1),
// 	new THREE.Vector2(1, 1),
// )
// const _vec2 = new THREE.Vector2()

function CubicBezier(t, p0, p1, p2, p3) {
	const k = 1 - t

	return k * k * k * p0 + k * k * t * 3 * p1 + k * t * t * 3 * p2 + t * t * t * p3
}

// @NOTE 测试，MBP 1000次取样 3ms
const cubicBezierOutGetY = (x) => {
	let left = 0,
		right = 1,
		t = (left + right) / 2

	let _x = CubicBezier(t, 0, 0.95, 0.95, 1)
	// cubicBezierOut.getPoint(t, _vec2)

	let _c = 0

	while (Math.abs(_x - x) > 0.0005) {
		if (_x > x) {
			right = t
		} else {
			left = t
		}
		t = (left + right) / 2
		_x = CubicBezier(t, 0, 0.95, 0.95, 1)
		// cubicBezierOut.getPoint(t, _vec2)

		_c++
	}

	// console.log('二分法次数', _c);

	return CubicBezier(t, 0, 1, 1, 1)
	// return _vec2.y
}

// const _temp = {}

export function easeCubicBezierOut(p) {
	return cubicBezierOutGetY(p)
}

export function easeCubicBezierSlowIn(x) {
	// 0,	0
	// 1, 	0
	// 0.8,	1
	// 1,	1
	let left = 0,
		right = 1,
		t = (left + right) / 2

	let _x = CubicBezier(t, 0, 1, 0.95, 1)
	// cubicBezierOut.getPoint(t, _vec2)

	let _c = 0

	while (Math.abs(_x - x) > 0.0005) {
		if (_x > x) {
			right = t
		} else {
			left = t
		}
		t = (left + right) / 2
		_x = CubicBezier(t, 0, 1, 0.95, 1)
		// cubicBezierOut.getPoint(t, _vec2)

		_c++
	}

	// console.log('二分法次数', _c);

	return CubicBezier(t, 0, 0, 1, 1)
}

// 多个值，两两缓动
export function easeAmong(count, p) {
	const step = 1 / count
	const prev = Math.floor(p / step)
	const next = prev >= count - 1 ? prev : prev + 1
	const _p = (p % step) / step
	return [prev, next, _p]
}

// From TWEENS
export function easeCruise(p) {
	return (Math.sin(2 * Math.PI * p) * (Math.sin(p * 2 * Math.PI - Math.PI / 2) + 1)) / 2
}
export function easeCruise2(p) {
	return Math.sin(2 * Math.PI * p)
}

export function Exponential_In(k) {
	return k === 0 ? 0 : Math.pow(1024, k - 1)
}
export function Exponential_Out(k) {
	return k === 1 ? 1 : 1 - Math.pow(2, -10 * k)
}
export function Quadratic_In(k) {
	return k * k
}
export function Quadratic_Out(k) {
	return k * (2 - k)
}
export function Cubic_In(k) {
	return k * k * k
}
export function Cubic_Out(k) {
	return --k * k * k + 1
}
export function Quad_InOut(k) {
	return getPowInOut(4)(k)
}
export function getPowInOut(pow) {
	return function (t) {
		if ((t *= 2) < 1) return 0.5 * Math.pow(t, pow)
		return 1 - 0.5 * Math.abs(Math.pow(2 - t, pow))
	}
}
