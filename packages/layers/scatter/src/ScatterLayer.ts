/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { computeBBox, computeBSphere } from '@gs.i/utils-geometry'
import { ScatterMatr } from './ScatterMatr'
import { Mesh, Geom, MatrPoint, Attr } from '@gs.i/frontend-sdk'
import { Color } from '@gs.i/utils-math'
import { StandardLayer, StandardLayerProps } from '@polaris.gl/layer-std'

type DataType = {
	lng?: number | string
	lat?: number | string
	alt?: number | string
	lnglatalt?: number[]
	value: number
}

export interface ScatterLayerProps extends StandardLayerProps {
	size: number
	opacity: number
	color: string
	useColors: boolean
	colors?: { color: string; value: number }[]
	map: string
	enableBlending: boolean
	enableShining: boolean
	// 是否开启透视效果
	sizeAttenuation: boolean
	// 闪烁速度
	shiningSpeed: number
	// TextureAtlas中的位置
	colNumber: number
	rowNumber: number
	// 基本高度，与每个点的单独高度叠加
	baseAlt: number
	renderOrder: number
	depthTest: boolean

	data?: DataType[]
}

export const defaultProps: ScatterLayerProps = {
	size: 1,
	opacity: 1,
	color: '#B900FD',
	useColors: false,
	colors: [
		{ color: '#FDC871', value: 0.2 },
		{ color: '#FF7300', value: 0.4 },
		{ color: '#C0370A', value: 0.6 },
		{ color: '#881C1C', value: 0.8 },
	],
	map: 'https://img.alicdn.com/tfs/TB1X4pmgAyWBuNjy0FpXXassXXa-64-64.png',
	enableBlending: true,
	enableShining: true,
	sizeAttenuation: false,
	shiningSpeed: 1,
	colNumber: 1,
	rowNumber: 1,
	baseAlt: 0,
	renderOrder: 0,
	depthTest: false,

	data: [],
}

export class ScatterLayer extends StandardLayer {
	props: any

	mesh: Mesh
	geom: Geom
	matr: ScatterMatr

	track: any

	constructor(props: Partial<ScatterLayerProps> = {}) {
		const _props = {
			...defaultProps,
			...props,
		}
		super(_props)

		this.props = _props

		this.mesh = new Mesh({ name: 'Scatter' })
		this.geom = new Geom({ mode: 'POINTS' })

		this.mesh.geometry = this.geom
		this.group.add(this.mesh)

		this.listenProps(['useColors', 'colors', 'sizeAttenuation'], () => {
			_props.useColors = this.getProps('useColors')
			_props.colors = this.getProps('colors')
			_props.sizeAttenuation = this.getProps('sizeAttenuation')

			this.matr = new ScatterMatr(_props)
			this.mesh.material = this.matr
		})

		this.listenProps(
			[
				'size',
				'opacity',
				'color',
				'enableBlending',
				'enableShining',
				'shiningSpeed',
				'colNumber',
				'rowNumber',
				'map',
			],
			() => {
				_props.size = this.getProps('size')
				_props.opacity = this.getProps('opacity')
				_props.enableBlending = this.getProps('enableBlending')
				_props.depthTest = this.getProps('depthTest')
				_props.color = this.getProps('color')
				_props.colNumber = this.getProps('colNumber')
				_props.rowNumber = this.getProps('rowNumber')
				_props.map = this.getProps('map')

				this.matr.setProps(_props)
			}
		)
	}

	init(projection, timeline) {
		this.resetShining(timeline)

		this.listenProps(['enableShining', 'baseAlt', 'data'], () => {
			this.createScattersGeom(this.getProps('data'))
			this.resetShining(timeline)
			// this.show()
		})

		this.listenProps(['renderOrder'], () => {
			this.group.renderOrder = this.mesh.renderOrder = this.getProps('renderOrder')
		})

		this.listenProps(['depthTest'], () => {
			this.matr.depthTest = this.getProps('depthTest')
		})
	}

	async show(duration = 1000) {
		this.matr.alphaMode = 'BLEND'
		this.matr.opacity = 0.0
		this.visible = true

		const timeline = await this.getTimeline()
		timeline.addTrack({
			id: 'ScatterLayer Show',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				if (this.getProps('opacity') < 1.0) {
					if (this.getProps('enableBlending')) {
						this.matr.alphaMode = 'BLEND_ADD'
					} else {
						this.matr.alphaMode = 'BLEND'
					}
				} else {
					this.matr.alphaMode = 'OPAQUE'
				}
				this.visible = true
			},
			onUpdate: (t, p) => {
				this.matr.opacity = this.getProps('opacity') * p
			},
		})
	}

	async hide(duration = 1000) {
		this.matr.alphaMode = 'BLEND'
		this.matr.opacity = this.getProps('opacity')
		const timeline = await this.getTimeline()
		timeline.addTrack({
			id: 'ScatterLayer Hide',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				this.matr.opacity = 0.0
				this.visible = false
			},
			onUpdate: (t, p) => {
				this.matr.opacity = this.getProps('opacity') * (1 - p)
			},
		})
	}

	private async createScattersGeom(data: any[] = []) {
		this.props.data = data

		const projection = await this.getProjection()
		const baseAlt = this.getProps('baseAlt')

		const positions: number[] = []
		const colrows: number[] = []
		const ratios: number[] = []
		const delays: number[] = []

		data.forEach((d) => {
			const { lng, lat, alt, lnglatalt, value, row = 0, col = 0 } = d

			let xyz
			if (lng !== undefined && lat !== undefined) {
				xyz = projection.project(lng, lat, baseAlt + (alt ?? 0))
			} else if (lnglatalt !== undefined) {
				xyz = projection.project(lnglatalt[0], lnglatalt[1], baseAlt + (lnglatalt[2] ?? 0))
			} else {
				console.error(`ScatterLayer - data item has no position info ${d}`)
				return
			}

			positions.push(...xyz)

			ratios.push(value)
			colrows.push(col % this.getProps('colNumber'), row % this.getProps('rowNumber'))

			const delay = this.getProps('enableShining') ? Math.PI * 2 * Math.random() : 0
			delays.push(delay)
		})

		if (!this.geom) return

		this.geom.attributes['position'] = new Attr(new Float32Array(positions), 3)
		this.geom.attributes['colrow'] = new Attr(new Float32Array(colrows), 2)
		this.geom.attributes['ratio'] = new Attr(new Float32Array(ratios), 1)
		this.geom.attributes['delay'] = new Attr(new Float32Array(delays), 1)

		this.geom.boundingBox = computeBBox(this.geom)
		this.geom.boundingSphere = computeBSphere(this.geom)

		this.mesh.geometry = this.geom
	}

	private resetShining(timeline) {
		if (this.track && this.track.alive) {
			this.track.alive = false
		}
		if (this.getProps('enableShining')) {
			const speed = this.props.shiningSpeed / 1000
			this.track = timeline.addTrack({
				startTime: timeline.currentTime,
				duration: Infinity,
				onUpdate: (t) => {
					this.matr.uniforms['time'].value = t * speed
				},
			})
		}
	}
}
