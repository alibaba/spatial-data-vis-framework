/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Vector3 } from '@gs.i/utils-math'
import { Timeline } from 'ani-timeline'
import { Projection, GeocentricProjection } from '@polaris.gl/projection'
import { FlyLineProps, FlyLine, DefaultFlyLineProps } from './FlyLine'
import { STDLayer, STDLayerProps } from '@polaris.gl/layer-std'
import { Grid } from './Grid'

export interface FlyLineLayerProps extends Partial<FlyLineProps>, Partial<STDLayerProps> {
	duration?: number
	delay?: number
	repeat?: boolean
	minHeight?: number
	maxHeight?: number
	renderOrder?: number
	depthTest?: boolean
	data?: any[]
}

export const DefaultLayerProps: FlyLineLayerProps = {
	...DefaultFlyLineProps,
	duration: 5000,
	delay: 1000,
	repeat: true,
	minHeight: 1,
	maxHeight: 2,
	renderOrder: 0,
	depthTest: true,
	data: [],
}

/**
 * @dataformat
 * data = [ {
 *      lnglatStart: [],
 *      lnglatEnd: [],
 *      minHeight,
 *      maxHeight,
 *      duration,
 *      delay,
 *      repeat
 *  }... ]
 */
export class FlyLineLayer extends STDLayer {
	props: FlyLineLayerProps

	flyline: FlyLine
	projection: Projection
	geoWrapProjection: Projection
	timeline: Timeline
	geocentricLayer: STDLayer
	sid: number
	grids: FlyInfo[]
	data: any[]

	constructor(props: FlyLineLayerProps = {}) {
		const _props: FlyLineLayerProps = {
			...DefaultLayerProps,
			...props,
		}
		super(_props)
		this.props = _props

		this.grids = []

		this.listenProps(['renderOrder'], () => {
			this.flyline && (this.flyline.mesh.renderOrder = this.getProps('renderOrder'))
		})

		this.listenProps(['depthTest'], () => {
			this.flyline && (this.flyline.mesh.material.depthTest = this.getProps('depthTest'))
		})

		this.listenProps(['duration', 'delay', 'repeat', 'minHeight', 'maxHeight', 'data'], () => {
			this.props['duration'] = this.getProps('duration')
			this.props['delay'] = this.getProps('delay')
			this.props['repeat'] = this.getProps('repeat')
			this.props['minHeight'] = this.getProps('minHeight')
			this.props['maxHeight'] = this.getProps('maxHeight')
			const data = this.getProps('data')
			if (!data || !data.length) return
			this.updateFlylinesData(this.getProps('data'))
		})

		this.onViewChange = (cameraProxy) => {
			const w = cameraProxy.canvasWidth
			const h = cameraProxy.canvasHeight
			const originRes = this.flyline.mesh.material.config['resolution']
			if (originRes.x !== w || originRes.y !== h) {
				this.flyline.mesh.material.config['resolution'] = {
					x: cameraProxy.canvasWidth,
					y: cameraProxy.canvasHeight,
				}
			}
		}
	}

	init(projection, timeline, polaris) {
		this.projection = projection
		this.timeline = timeline

		const listeningFlylineProps = [
			'data',
			'level',
			'color',
			'opacity',
			'transparent',
			'lineWidth',
			'pointSize',
			'texture',
			'image',
			'flipY',
			'resolution',
			'usePerspective',
			'usePoint',
			'infinity',
			'lineSegments',
			'flyPercent',
			'pool',
			'easing',
			'frameDropping',
			'useColors',
			'colors',
		]
		this.listenProps(listeningFlylineProps, () => {
			listeningFlylineProps.forEach((key) => {
				this.props[key] = this.getProps(key)
			})
			const data = this.getProps('data')
			if (!data || !data.length) return

			this.props.pool = Math.max(data.length, this.getProps('pool'))
			// Re-create flyline instance
			this.createFlyline(timeline, polaris)
			this.updateFlylinesData(data)
		})
	}

	createFlyline(timeline, polaris) {
		// Remove old flyline instance
		if (this.flyline) {
			//  Trick!!! 飞线在球面上插值必须是以坐标中心为球心的，所以如果当前投影不是 GeocentricProjection 的球面投影，
			//  飞线的轨迹差值会错乱，这种情况下，将飞线挂到一个临时的 layer 上，这个 layer 是 GeocentricProjection 投影
			if (this.geoWrapProjection && this.geoWrapProjection.isGeocentricProjection) {
				this.geocentricLayer.group.remove(this.flyline.mesh)
				this.remove(this.geocentricLayer)
			} else {
				this.group.remove(this.flyline.mesh)
			}
		}

		this.flyline = new FlyLine({
			...this.props,
			timeline: timeline,
			resolution: {
				x: polaris.cameraProxy.canvasWidth,
				y: polaris.cameraProxy.canvasHeight,
			},
		})

		//  Trick!!! 飞线在球面上插值必须是以坐标中心为球心的，所以如果当前投影不是 GeocentricProjection 的球面投影，
		//  飞线的轨迹差值会错乱，这种情况下，将飞线挂到一个临时的 layer 上，这个 layer 是 GeocentricProjection 投影
		if (this.projection.isShpereProjection && !this.projection.isGeocentricProjection) {
			this.geoWrapProjection = new GeocentricProjection({ center: [0, 0, 0] })
			this.geocentricLayer = new STDLayer({
				parent: this,
				projection: this.geoWrapProjection,
			})
			this.geocentricLayer.group.add(this.flyline.mesh)
		} else {
			this.geoWrapProjection = this.projection
			this.group.add(this.flyline.mesh)
		}
	}

	updateFlylinesData(data) {
		if (!this.flyline) {
			return
		}

		// Clear repeating callback => clear all tracks
		this.grids.forEach((item) => (item.grid.onEnd = () => {}))
		this.flyline.clear()

		const grids: FlyInfo[] = []
		for (let i = 0, l = data.length; i < l; i++) {
			const d = data[i]
			const { xyzStart, xyzEnd, duration, minHeight, maxHeight, delay, repeat } = d

			// @浅寻 Patch format: `lngStart` `latStart` `lngEnd` `latEnd`
			const { lngStart, latStart, altStart, lngEnd, latEnd, altEnd } = d
			let { lnglatStart, lnglatEnd } = d

			if (
				lngStart !== undefined &&
				latStart !== undefined &&
				lngEnd !== undefined &&
				latEnd !== undefined
			) {
				lnglatStart = [lngStart, latStart, altStart]
				lnglatEnd = [lngEnd, latEnd, altEnd]
			}

			let posStart, posEnd
			if (lnglatStart && lnglatEnd) {
				posStart = this.geoWrapProjection.project(lnglatStart[0], lnglatStart[1], lnglatStart[2])
				posEnd = this.geoWrapProjection.project(lnglatEnd[0], lnglatEnd[1], lnglatEnd[2])
			} else if (xyzStart && xyzEnd) {
				posStart = xyzStart
				posEnd = xyzEnd
			}

			const segment = this.getProps('lineSegments') as number
			const padding = segment * (this.getProps('flyPercent') as number)
			const grid = new Grid({
				pointStart: new Vector3().fromArray(posStart),
				pointEnd: new Vector3().fromArray(posEnd),
				segment: segment,
				padding: padding,
				maxHeight: maxHeight ?? this.getProps('maxHeight'),
				minHeight: minHeight ?? this.getProps('minHeight'),
				type: this.geoWrapProjection.isPlaneProjection ? 'onPlane' : 'onSphere',
			})
			grids.push({
				grid: grid,
				duration: duration || (this.getProps('duration') as number),
				delay: delay || (this.getProps('delay') as number) * i,
				repeat: repeat === undefined ? this.getProps('repeat') : repeat,
			})
		}

		this._fly(grids)
	}

	_fly(grids: FlyInfo[] = []) {
		const flyline = this.flyline
		this.grids = grids || this.grids
		this.grids.forEach((info) => {
			if (info.repeat) {
				let originCallback
				if (info.grid.onEnd) {
					originCallback = info.grid.onEnd
				}
				info.grid.onEnd = () => {
					originCallback && originCallback()
					flyline.fly(info.grid, info.duration, info.delay)
				}
			}
			flyline.fly(info.grid, info.duration, info.delay)
		})
	}

	async show(duration = 1000) {
		this.flyline.matr.alphaMode = 'BLEND'
		this.flyline.matr.opacity = 0.0
		this.group.visible = true

		const timeline = await this.getTimeline()
		timeline.addTrack({
			id: 'FlylineLayer Show',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				this.flyline.matr.alphaMode = this.getProps('transparent') ? 'BLEND' : 'OPAQUE'
				this.flyline.matr.opacity = this.getProps('opacity')
				this.group.visible = true
			},
			onUpdate: (t, p) => {
				this.flyline.matr.opacity = this.getProps('opacity') * p
			},
		})
	}

	async hide(duration = 1000) {
		this.flyline.matr.alphaMode = 'BLEND'
		this.flyline.matr.opacity = this.getProps('opacity')

		const timeline = await this.getTimeline()
		timeline.addTrack({
			id: 'FlylineLayer Hide',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				this.flyline.matr.alphaMode = this.getProps('transparent') ? 'BLEND' : 'OPAQUE'
				this.flyline.matr.opacity = this.getProps('opacity')
				this.group.visible = false
			},
			onUpdate: (t, p) => {
				this.flyline.matr.opacity = this.getProps('opacity') * (1 - p)
			},
		})
	}
}

type FlyInfo = {
	grid: Grid
	duration: number
	delay: number
	repeat: boolean
}
