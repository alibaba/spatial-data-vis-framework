/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Vector2, Vector3 } from '@gs.i/utils-math'

/**
 * 颜色线性插值(不会修改传入值)
 * @method colorLerp
 * @param  {Int}  count  生成差值结果的数量
 * @param  {Array[THREE.Color]}  colors 关键帧颜色(可以带__alpha通道)
 * @return {Array[THREE.Color]} 差值结果
 * @TODO alpha通道是否应该影响到前后两个颜色的rgb权重?(preMultAlpha)
 * @TODO 如果结果数量和关键帧数量对不齐, 会导致一些关键帧不会出现在结果中
 */
export function colorLerp(count, colors) {
	const colorsLen = colors.length
	if (count < colorsLen) {
		console.warn('colors.length shall be smaller than count')
		return colors
	}
	const result: any[] = [] // 差值结果
	// const keys = [] // 关键帧的位置

	for (let i = 0; i < count; i++) {
		const pos = (i / (count - 1)) * (colorsLen - 1)
		const posFloor = Math.floor(pos)
		const posCeil = Math.ceil(pos)
		const a = pos - posFloor
		let compound: any
		if (a > 0.001) {
			const colorPrev = colors[posFloor]
			const colorNext = colors[posCeil]
			compound = lerpArray(colorPrev, colorNext, a)
		} else {
			compound = colors[posFloor]
		}
		result[i] = compound
	}

	return result
}

function lerpArray(from, to, a) {
	const result: any[] = []
	for (let i = 0; i < from.length; i++) {
		result[i] = to[i] * a + from[i] * (1 - a)
	}
	return result
}

/**
 * 经纬度坐标到平面 xyz 转换方法
 *
 * @param {float} lng 经度
 * @param {float} lat 纬度
 * @param {Array} center 平面中心的经纬度
 * @param {float} 缩放比
 * @return {Object} 返回球面 xyz 坐标的对象
 */
export function ll2xyzPlane(lng, lat, center, scale) {
	return {
		x: (lng - center[0]) * scale,
		y: (lat - center[1]) * scale,
		z: 0,
	}
}

/**
 * 经纬度坐标到球面 xyz 转换方法
 *
 * @param {float} lng 经度
 * @param {float} lat 纬度
 * @param {float} radius 球半径
 * @return {Object} 返回球面 xyz 坐标的对象
 */
export function ll2xyz(lng, lat, radius) {
	const phi = (lat * Math.PI) / 180
	const theta = ((lng - 180) * Math.PI) / 180

	const x = -radius * Math.cos(phi) * Math.cos(theta)
	const y = radius * Math.sin(phi)
	const z = radius * Math.cos(phi) * Math.sin(theta)

	return {
		x,
		y,
		z,
	}
}

// 数组降维
export function dimReduce(array) {
	let linearArray
	if (Array.isArray(array[0])) {
		linearArray = concatTurbo(array)
	} else if (array[0].BYTES_PER_ELEMENT) {
		linearArray = concatTypedArray(array)
	} else {
		linearArray = array
	}
	return linearArray
}

// 优化的concat
function concatTurbo(arrays) {
	const result: any[] = []
	for (let i = 0; i < arrays.length; i++) {
		// result.push.apply(result, arrays[i]);
		result.push(...arrays[i])
	}
	return result
}

export function concatTypedArray(arrays) {
	let length = 0
	const offsets = [0]
	arrays.forEach((array) => {
		length += array.length
		offsets.push(length)
	})

	const result = new arrays[0].constructor(length)
	for (let i = 0; i < arrays.length; i++) {
		result.set(arrays[i], offsets[i])
	}

	return result
}

// 球面线性插值
export function slerp(p0, p1, t, omiga) {
	const np0 = p0.clone().normalize()
	const np1 = p1.clone().normalize()
	const finalOmiga = omiga || Math.acos(np0.dot(np1))
	const sinOmiga = Math.sin(finalOmiga)
	const l = p0.clone().multiplyScalar(Math.sin((1 - t) * finalOmiga) / sinOmiga)
	const r = p1.clone().multiplyScalar(Math.sin(t * finalOmiga) / sinOmiga)
	return l.add(r)
}

// 二次贝塞尔
export function quadraticBezier(p0, p1, p2, t): Vector3 {
	const A = p0.clone().multiplyScalar(Math.pow(1 - t, 2))
	const B = p1.clone().multiplyScalar((1 - t) * 2 * t)
	const C = p2.clone().multiplyScalar(Math.pow(t, 2))
	return A.add(B.add(C))
}

/**
 * 平面上方的二次贝塞尔曲线
 *   ___
 * /    \
 * @TODO: 目前使用的是性能较好的方案（二维二次贝塞尔）
 *        问题是无法进行倾斜
 *        可以改成 三维三次贝塞尔曲线 来实现倾斜角
 * @method getGrid2Bezier
 * @param  {THREE.Vector3} pa             起点
 * @param  {THREE.Vector3} pb             终点
 * @param  {Number}        seg            分段
 * @param  {Number}        [minHeight=1]  最小高度（系数）
 * @param  {Number}        [maxHeight=10] 最大高度（系数）
 * @param  {Number}        [baseHeight=0] 起飞平面的z偏移
 * @param  {Number}        [incline=0]    向y的倾斜度（弧度，可以为负）
 * @param  {Number}        [maxDistance=500]    距离达到这个值的时候有最大高度
 * @return {Array}
 */
export function getGrid2Bezier(
	pa,
	pb,
	seg,
	minHeight = 1,
	maxHeight = 10,
	baseHeight = 0,
	incline = 0,
	maxDistance = 500
): number[] {
	const points: number[] = []
	// 曲线中间点距离起终点连线的距离（即整条线的最大高度）
	// 当起终点距离为0时，得到minHeight，距离为maxDistance时，得到maxHeight
	// NOTE：超过maxDistance时依然会继续增大，也可以强制限制为maxHeight，不过感觉并不好
	const midHeight = (pa.distanceTo(pb) / maxDistance) * (maxHeight - minHeight) + minHeight
	// 起终点连线中点
	const midPoint = pa.clone().lerp(pb, 0.5)
	// NOTE: 由于精度问题，这里的midPoint.z 可能小于0（pa.z和pb.z 都是等于0的）
	// NOTE: 直接 midPoint.z = 0 是没有用的！
	// 加上z轴偏移
	const shadowPoint = midPoint.clone().set(0, 0, midHeight)
	// 旋转（倾斜）
	shadowPoint.applyAxisAngle(pb.clone().sub(pa).normalize(), incline)
	midPoint.add(shadowPoint)
	// 控制点 NOTE: 可以调整最后的系数来控制曲线形状（比方说生成更圆滑或者不对称的曲线）
	// @TODO 移到后面的分支判断里，每次计算只需要用到一个
	const ctrPointA = midPoint.clone().add(pa.clone().sub(pb).multiplyScalar(0.25))
	const ctrPointB = midPoint.clone().sub(pa.clone().sub(pb).multiplyScalar(0.25))
	// 起点-控制点-中间点的二次贝塞尔 加上 中间点-控制点-起点的二次贝塞尔
	// NOTE：用二次贝塞尔是为了能直接的控制中间点（最高点）的高度
	for (let i = 0; i < seg; i++) {
		const t = (i / (seg - 1)) * 2
		let p: Vector3
		if (t < 1) {
			p = quadraticBezier(pa, ctrPointA, midPoint, t)
		} else {
			p = quadraticBezier(midPoint, ctrPointB, pb, t - 1)
		}
		points[i * 3 + 0] = p.x
		points[i * 3 + 1] = p.y
		points[i * 3 + 2] = p.z + baseHeight
	}

	return points
}

// 构造平面二次贝塞尔来决定外延高度
// TODO: 这里要么直接做表, 要么加缓存
export function getHeight(maxHight, t) {
	// maxHight为相对于半径的倍数
	const p0 = new Vector2(0, 0)
	const p1 = new Vector2(0.5, maxHight)
	const p2 = new Vector2(1, maxHight)
	// TODO: 不需要 _t
	let _t = t * 2
	if (t > 1) {
		_t = 2 - _t
	}
	return quadraticBezier(p0, p1, p2, _t).y
}

// 球面插值 外加二次贝塞尔外延
export function getGrid2BezierAddSlerp(
	pa,
	pb,
	seg,
	radius = 10,
	minHeight = 0.01,
	maxHeight = 0.2
): number[] {
	let omiga = pa.angleTo(pb)
	// 如果两点连线恰好过圆心，必须强制加上偏移，不然slerp算法会得到错误的结果
	if (omiga >= Math.PI) {
		pb.applyAxisAngle(pb.clone().set(0, 0, 1), 0.0001)
		omiga = pa.angleTo(pb)
	}
	const points: number[] = []
	// 中间点的高度，即该条grid的最高高度
	const height = (omiga / Math.PI) * (maxHeight - minHeight) + minHeight
	for (let i = 0; i < seg; i++) {
		const p = slerp(pa, pb, i / (seg - 1), omiga) // 贴球面的基准点
		p.multiplyScalar(1 + getHeight(height, i / seg))
		points[i * 3 + 0] = p.x
		points[i * 3 + 1] = p.y
		points[i * 3 + 2] = p.z
	}

	return points
}

/**
 * 单增贝塞尔，锚点一个朝上一个朝下
 *       /
 *   ---
 * /
 * 用于三明治飞线，在两个平面之间飞
 * @param  {[type]} pa      [description]
 * @param  {[type]} pb      [description]
 * @param  {[type]} seg     [description]
 * @param  {[type]} tension [description]
 * @return {[type]}         [description]
 */
export function getGrid2BezierMonotone(pa, pb, seg, tension): number[] {
	const points: number[] = []

	const midPoint = pa.clone().lerp(pb, 0.5)
	const midHeight = midPoint.z - pa.z

	for (let i = 0; i < seg; i++) {
		const t = (i / (seg - 1)) * 2
		let p
		if (t < 1) {
			const ctrPoint = pa.clone()
			ctrPoint.z += midHeight * tension
			p = quadraticBezier(pa, ctrPoint, midPoint, t)
		} else {
			const ctrPoint = pb.clone()
			ctrPoint.z -= midHeight * tension
			p = quadraticBezier(midPoint, ctrPoint, pb, t - 1)
		}
		points[i * 3 + 0] = p.x
		points[i * 3 + 1] = p.y
		points[i * 3 + 2] = p.z
	}

	return points
}

// 定长线段, 避免Line3d重新计算
// NOTE: 有向补全, 缺头补头, 缺尾补尾
export function slicePathTurbo(path, offset, length) {
	// window.counter ++
	const start = offset >= 0 ? offset : 0
	const end = offset + length // end 超了的话slice会自己处理, 长度不会变得更长
	let re = path.slice(start, end)

	// path     0-1-2-3-4-5-6
	// slice  0-0-1-2-3
	if (offset < 0) {
		let buf = re.slice(0, 3)
		buf = buf.length > 2 ? buf : [0, 0, 0]
		let len = 0 - offset
		if (end < 0) {
			// path              0-1-2-3-4-5-6
			// slice  0-0-0-0-0
			len = length
		}
		const head: any[] = []
		for (let i = 0; i < len; i += 3) {
			// head = head.concat(buf) // benchmark性能更高，但是频繁GC
			head.push(...buf)
		}
		re = head.concat(re)
		// re.unshift(...head)
	}

	// path     0-1-2-3-4-5-6
	// slice            4-5-6-6-6
	if (end > path.length) {
		let buf = re.slice(-3)
		buf = buf.length > 2 ? buf : [0, 0, 0]
		let len = end - path.length
		if (offset > path.length) {
			// path   0-1-2-3-4-5-6
			// slice                6-6-6-6-6
			len = length
		}
		for (let i = 0; i < len; i += 3) {
			// re = re.concat(buf) // benchmark性能更高，但是频繁GC
			re.push(...buf)
		}
	}

	return re
}

export function fillWithZero(arr) {
	for (let i = 0; i < arr.length; i++) {
		arr[i] = 0
	}
}

export function slicePaddedBuffer(buffer, offset, length, padding) {
	return buffer.subarray(offset + padding, offset + padding + length)
}

export function transToVector3(input): Vector3 {
	const v = new Vector3()
	if (Array.isArray(input)) {
		v.fromArray(input)
	} else if (input.x !== undefined && input.y !== undefined && input.z !== undefined) {
		v.x = input.x
		v.y = input.y
		v.z = input.z
	}
	return v
}
