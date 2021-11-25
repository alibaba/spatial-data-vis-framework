/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Timeline, Track } from 'ani-timeline'
import { Color } from '@gs.i/utils-math'
import { GLine, GLineMatr, GLinePointMatr } from '@gs.i/utils-gline'
import { colorLerp, concatTypedArray, dimReduce } from './util'
import { Grid } from './Grid'
import { TextureType } from '@gs.i/schema'

export interface FlyLineProps {
	// GLine api
	level: 0 | 1 | 2 | 4
	resolution: { x: number; y: number }
	lineWidth: number
	pointSize: number
	color: string
	transparent: boolean
	opacity: number
	image?: string
	flipY?: boolean
	texture?: TextureType
	useColors: boolean
	usePerspective: boolean
	usePoint: boolean
	// 画点的路径需要对路径意外的点填充标识常量
	infinity: number

	// FlyLine api
	// @NOTE: 这里修改为点数而非片段数，点数=片段数+1
	// 每条飞线路径的总点数
	lineSegments: number

	// 飞行的部分占总路径的比例 0~1
	flyPercent: number

	// 飞线线程池 应设置为max(一次update后新增的线+还没飞完的线)
	pool: number

	// 差值函数
	easing: (p: number) => number

	// 跳过帧
	frameDropping: number

	colors?: string[]

	gline?: GLine

	timeline?: Timeline
}

export const DefaultFlyLineProps: FlyLineProps = {
	// GLine api
	level: 2,
	resolution: { x: 500, y: 500 },
	color: '#03A9F4',
	transparent: true,
	opacity: 1.0,
	lineWidth: 10,
	pointSize: 5,
	image: 'https://img.alicdn.com/tfs/TB1fNL.awDD8KJjy0FdXXcjvXXa-24-527.png',
	flipY: true,
	texture: undefined,
	useColors: false,
	colors: ['rgba(255, 0, 0, 1.0)', 'rgba(255, 255, 0, 0.5)', 'rgba(255, 0, 255, 1.0)'],
	usePerspective: false,
	usePoint: false,
	infinity: 99999999.999,
	lineSegments: 20,
	flyPercent: 0.5,
	pool: 20,
	easing: (p) => p,
	frameDropping: 0,
}

export class FlyLine {
	props: FlyLineProps

	sampler: any
	mesh: GLine
	gline: GLine
	matr: GLineMatr | GLinePointMatr
	timeline: Timeline
	track: any
	trackID: string
	flySegments: number // 每条飞线的飞行部分点数
	flightLength: number // 飞行总长度
	flightLength_1: number // 飞行总长度1
	flightLength_2: number // 飞行总长度2
	landingP: number // 着地时间
	useColors: boolean

	private pointer: number // 飞线数组pointer, <= config.pool
	private frameCounting: number
	private frameValid: boolean
	private colorBuffer: Float32Array

	constructor(props: Partial<FlyLineProps> = {}) {
		const _props = {
			...DefaultFlyLineProps,
			...props,
		}

		this.props = _props

		this.init(this.props.timeline)
	}

	init(timeline) {
		if (!timeline) {
			throw new Error('FlyLine::缺少必要参数 timeline')
		}

		this.timeline = timeline

		// @TODO not safe
		this.trackID = '' + Math.random() * 999999

		// 飞行部分的点数 = 总点数 * 飞行比例
		this.flySegments = Math.floor(this.props.lineSegments * this.props.flyPercent)
		// 飞行总长度, 避免大量重复计算
		this.flightLength = this.props.lineSegments + this.flySegments
		this.flightLength_1 = this.flightLength - 1
		this.flightLength_2 = this.flightLength - 2

		// 着地时间
		this.landingP = this.props.lineSegments / this.flightLength

		this.useColors = !!this.props.useColors && !!this.props.colors && this.props.colors.length > 0

		this.sampler = {
			anisotropy: 8,
			minFilter: 'LINEAR_MIPMAP_NEAREST',
		}

		// 优先使用image属性
		if (this.props.image) {
			this.props.texture = {
				image: {
					uri: this.props.image,
					flipY: !!this.props.flipY,
				},
				sampler: this.sampler,
			}
		} else if (this.props.texture && this.props.texture.image && this.props.texture.image.uri) {
			this.props.texture = {
				image: this.props.texture.image,
				sampler: this.sampler,
			}
		}

		const glineConfig = {
			level: this.props.level,
			lineWidth: this.props.lineWidth,
			pointSize: this.props.pointSize,
			color: new Color(this.props.color),
			opacity: this.props.opacity,
			texture: this.props.useColors ? undefined : this.props.texture,
			resolution: this.props.resolution,
			usePerspective: this.props.usePerspective,
			useColors: this.useColors,
			dynamic: true,
			u: !(this.props.texture === undefined),
		}

		this.updateColors(this.props.colors, glineConfig)

		this.gline = this.props.gline || new GLine(glineConfig)
		this.mesh = this.gline
		this.mesh.name = 'FlyLine-' + this.trackID
		this.matr = this.gline.material
		this.matr.alphaMode = this.props.transparent ? 'BLEND' : 'OPAQUE'

		// 缓冲池
		// this.bufferLength = this.config.pool * this.config.segment;
		// const posBuffers = new Float32Array(this.bufferLength * 3);
		const posBuffers: Float32Array[] = []
		for (let i = 0; i < this.props.pool; i++) {
			const b = new Float32Array(this.flySegments * 3)
			this.props.usePoint && b.fill(this.props.infinity)
			posBuffers.push(b)
		}

		this.pointer = 0

		this.gline.geometry.updateData({
			positions: posBuffers,
			colors: this.colorBuffer,
		})

		// 主动降帧率
		this.frameCounting = 0
		this.frameValid = true
		this.timeline.addTrack({
			startTime: this.timeline.currentTime,
			duration: Infinity,
			onUpdate: () => {
				this.frameCounting++
				if (this.frameCounting > this.props.frameDropping) {
					this.frameValid = true
					this.frameCounting = 0
				} else {
					this.frameValid = false
				}
			},
		})
	}

	fly(grid, duration = 1000, delay = 0): Track {
		if (!grid.isGrid) {
			grid = new Grid({
				paddingValue: this.props.usePoint ? this.props.infinity : undefined,
				...grid,
				segment: this.props.lineSegments,
				padding: this.flySegments,
			})
		}
		// 该飞线数组的pointer
		let pointer
		let lastOffset
		const track = this.timeline.addTrack({
			id: this.trackID,
			startTime: this.timeline.currentTime + delay,
			duration,
			loop: false,
			onStart: (time) => {
				// 环形Buffer链表
				pointer = this.pointer
				this.pointer++
				if (this.pointer >= this.props.pool) {
					this.pointer = 0
				}
				grid.alive = true
				grid.landed = false
				grid.onStart && grid.onStart()
			},
			onEnd: (time) => {
				grid.alive = false
				grid.onEnd && grid.onEnd()
			},
			onUpdate: (time, p) => {
				if (!this.frameValid) return

				const easedP = this.props.easing(p)
				// const easedP = 0.1;
				// const offset = 1 - Math.ceil(easedP * this.flightLength);
				// 方案1：从首点开始，最终停在尾点
				// const offset = 1 - this.config.segment + Math.ceil(easedP * this.flightLength_2);
				// 方案2：从首点上一个点开始，最终停在尾点后一个点
				const offset = 1 - this.flySegments + Math.ceil(easedP * this.flightLength_1)
				if (offset === lastOffset) {
					return
				}
				lastOffset = offset
				const positions = grid.slice(offset, this.flySegments)
				this.gline.geometry.updateSubData(
					{ positions },
					pointer * this.flySegments,
					this.flySegments
				)
				// 着陆回调
				if (!grid.landed && easedP > this.landingP) {
					grid.landed = true
					grid.onLand && grid.onLand(easedP - this.landingP)
				}
			},
		})

		track['name'] = 'flyline: ' + grid.id

		return track
	}

	clear() {
		const tracks = this.timeline.getTracksByID(this.trackID)
		for (let i = 0; i < tracks.length; i++) {
			const track = tracks[i]
			if (!track.started) {
				track.alive = false
			}
		}
	}

	private updateColors(colors, glineConfig) {
		if (!this.props.useColors || !colors || colors.length === 0) {
			glineConfig['useColors'] = false
		} else {
			// @TODO lerp colors
			let _colors
			if (colors.length > this.flySegments) {
				_colors = colors.slice(0, this.flySegments)
				_colors = _colors.reverse().map((color) => this._parseColorStr(color))
				_colors = dimReduce(_colors)
			} else {
				_colors = colors.reverse().map((color) => this._parseColorStr(color))
				_colors = colorLerp(this.flySegments, _colors)
				_colors = dimReduce(_colors)
			}

			if (_colors.length !== this.flySegments * 4) {
				console.warn('颜色数据长度错误，请检查config.colors格式')
				return
			}

			let allColors: any[] = []
			for (let i = 0; i < this.props.pool; i++) {
				allColors.push(new Float32Array(_colors))
			}
			allColors = concatTypedArray(allColors)
			this.colorBuffer = new Float32Array(allColors)
		}
	}

	/**
	 * 处理一个颜色
	 * @method _parseColor
	 * @param  {Array}
	 * @return {Array[r,g,b,a]}
	 */
	private _parseColor(array) {
		const _arr: number[] = []
		if (typeof array[0] === 'string') {
			return _arr.concat(new Color(array[0]).toArray()).concat(array[1])
		} else if (array[0].isColor) {
			return _arr.concat(array[0].toArray()).concat(array[1])
		} else {
			return array
		}
	}

	private _parseColorStr(str) {
		const color = new Color(str)
		const elements = str.split(',')
		const a = parseFloat(elements[elements.length - 1].replace(')', ''))
		return [color.r, color.g, color.b, a]
	}
}
