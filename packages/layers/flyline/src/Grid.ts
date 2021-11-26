/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import {
	dimReduce,
	getGrid2Bezier,
	getGrid2BezierAddSlerp,
	getGrid2BezierMonotone,
	slicePaddedBuffer,
	transToVector3,
} from './util'

/**
 * 飞线路径生成器
 */
const confDefault = {
	/**
	 * 支持四种模式
	 * - onSphere: 球面上方飞线, slerp算法+二维二次对称贝塞尔
	 * - onPlane: 平面上方飞线，三维二次对称贝塞尔曲线，
	 *            可以得到接近三维三次贝塞尔曲线的效果，
	 *            同时获得更好的控制性，以及三维二次贝塞尔曲线的性能
	 * - linear: 线性插值，笛卡尔系中的两个点连直线
	 * - sandwich: 两个平面之间飞
	 * - custom: 不生成轨道数据，直接使用用户传入值
	 * - empty: 空Grid，什么都不做
	 * @type {String}
	 */
	type: 'onSphere',

	points: [],

	segment: 100, // 路径点数，（自定义路径则忽略）
	padding: 10, // 初始化padding，当slice范围超出路径边界时，生成路径时直接预留padding能够提升效率
	paddingValue: undefined, // 用于首尾填充的值，如果undefined则填充首点和尾点

	pointStart: undefined, // 起点（自定义路径则忽略）
	pointEnd: undefined, // 终点（自定义路径则忽略）

	radius: 20, // （自定义路径则忽略）
	maxHeight: 1.2, //（自定义路径则忽略）
	minHeight: 1.1, //（自定义路径则忽略）
	incline: 0, //（自定义路径则忽略）
	tension: 0.5, //（自定义路径则忽略）

	// @TODO: 评估不使用Float32的可能性
	bufferType: Float32Array, // 通常不需要修改
}

export class Grid {
	isGrid = true
	conf: any
	points: number[]
	padding: number
	pointsBuffer: Float32Array | Float64Array

	onStart: () => void
	onEnd: () => void
	onLand: () => void

	constructor(config) {
		this.conf = { ...confDefault, ...config }
		if (this.conf.type === 'empty') {
			return this
		}
		if (this.conf.type !== 'custom') {
			if (!this.conf.pointStart) {
				console.error('lack of pointStart')
			}
			if (!this.conf.pointEnd) {
				console.error('lack of pointEnd')
			}
		}

		/** @QianXun 头尾调换位置，让飞线的头和color的头一致 */
		if (this.conf.pointStart && this.conf.pointEnd) {
			this.conf.pointStart = transToVector3(this.conf.pointStart)
			this.conf.pointEnd = transToVector3(this.conf.pointEnd)
		}

		this.onStart = this.conf.onStart
		this.onEnd = this.conf.onEnd
		this.onLand = this.conf.onLand

		if (this.conf.type === 'onPlane') {
			this.points = getGrid2Bezier(
				this.conf.pointStart,
				this.conf.pointEnd,
				this.conf.segment,
				this.conf.minHeight,
				this.conf.maxHeight,
				this.conf.baseH,
				this.conf.incline
			)
		} else if (this.conf.type === 'onSphere' || this.conf.type === 'onShpere') {
			this.points = getGrid2BezierAddSlerp(
				this.conf.pointStart,
				this.conf.pointEnd,
				this.conf.segment,
				this.conf.radius,
				this.conf.minHeight,
				this.conf.maxHeight
			)
		} else if (this.conf.type === 'linear') {
			this.points = []
			for (let i = 0; i < this.conf.segment; i++) {
				const p = this.conf.pointStart.clone().lerp(this.conf.pointEnd, i / (this.conf.segment - 1))
				this.points[i * 3 + 0] = p.x
				this.points[i * 3 + 1] = p.y
				this.points[i * 3 + 2] = p.z
			}
		} else if (this.conf.type === 'sandwich') {
			console.log('sandwich')
			this.points = getGrid2BezierMonotone(
				this.conf.pointStart,
				this.conf.pointEnd,
				this.conf.segment,
				this.conf.tension
			)
		} else if (this.conf.type === 'custom') {
			this.points = this.conf.points // 不生成轨道
			this.points = dimReduce(this.points)
			if (this.points.length / 3 !== this.conf.segment) {
				console.warn(`路径长度(${this.points.length / 3})与配置(${this.conf.segment})不符`)
				this.conf.segment = this.points.length / 3
			}
		} else {
			console.error('轨道生成器参数错误, type: ', this.conf.type)
		}

		this.padding = 0
		this.pointsBuffer = new this.conf.bufferType(this.points)
		this.updateBufferPadding(this.conf.padding)
	}

	slice(offset, count) {
		// @NOTE: 重复的slice操作会占用大量的性能
		// return slicePathTurbo(this.points, offset, length);
		// @NOTE: 改进为预先创建带padding的TypedArray，然后用subarray取出需要的部分

		// 本次slice超出路径范围的点数
		const padding = Math.max(-offset, offset + count - this.conf.segment)
		// 如果超出范围变大，则需要重建
		if (padding > this.padding) {
			// console.log(padding, this.padding);
			this.updateBufferPadding(padding)
		}
		return slicePaddedBuffer(this.pointsBuffer, offset * 3, count * 3, this.padding * 3)
	}

	updateBufferPadding(padding) {
		// console.log('重建paddedBuffer', padding);
		// 需要扩大的量
		const extraPadding = padding - this.padding
		// 新Buffer
		const newLength = this.pointsBuffer.length + extraPadding * 3 * 2
		const newBuffer = new this.conf.bufferType(newLength)
		// 拷贝原Buffer数据
		newBuffer.set(this.pointsBuffer, extraPadding * 3)
		// 填充多出来的部分
		let startPoint, endPoint
		if (this.conf.paddingValue === undefined) {
			startPoint = this.pointsBuffer.slice(0, 3)
			endPoint = this.pointsBuffer.slice(-3, this.pointsBuffer.length)
		} else {
			const value = this.conf.paddingValue
			// 为了保证TypedArray类型相同
			startPoint = this.pointsBuffer.slice(0, 3)
			startPoint[0] = value
			startPoint[1] = value
			startPoint[2] = value
			endPoint = startPoint
		}
		for (let i = 0; i < extraPadding; i++) {
			newBuffer.set(startPoint, i * 3)
			newBuffer.set(endPoint, newBuffer.length - 3 - i * 3)
		}
		// 替换掉原来的Buffer
		this.pointsBuffer = newBuffer
		this.padding = padding
	}

	/**
	 * 在worker中拼装
	 * @TODO 只能使用Float32Array
	 * @param  {Array(Grid)} grids 要打包的Grid对象数组
	 * @return {[gridsInfo, buffer]} 便于Worker高性能传输的格式
	 */
	static pack(grids) {
		const gridsInfo: any[] = []
		// Buffer总长
		const totalBufferLen = grids.reduce((previous, current) => {
			return previous + current.pointsBuffer.length
		}, 0)
		let bufferOffset = 0
		const buffer = new Float32Array(totalBufferLen)

		for (let i = 0; i < grids.length; i++) {
			const grid = grids[i]
			// 合并Buffer
			buffer.set(grid.pointsBuffer, bufferOffset)
			// 生成gridInfo
			gridsInfo.push({
				segment: grid.conf.segment,
				padding: grid.conf.padding,
				bufferLength: grid.pointsBuffer.length,
				bufferOffset,
			})
			bufferOffset += grid.pointsBuffer.length
		}
		return [[gridsInfo, buffer.buffer], [buffer.buffer]]
	}

	/**
	 * 在主线程中恢复
	 * @param  {Object} gridsInfo 	   轨道信息
	 * @param  {ArrayBuffer} buffer    buffer
	 * @return {Array(Grid)}           Grid对象数组
	 */
	static unpack(gridsInfo, buffer) {
		const grids: Grid[] = []
		for (let i = 0; i < gridsInfo.length; i++) {
			const info = gridsInfo[i]
			const grid = new Grid({
				type: 'empty',
				segment: info.segment,
				padding: info.padding,
			})
			grid.padding = info.padding
			grid.pointsBuffer = new Float32Array(
				buffer,
				Float32Array.BYTES_PER_ELEMENT * info.bufferOffset,
				info.bufferLength
			)
			grids.push(grid)
		}
		return grids
	}
}
