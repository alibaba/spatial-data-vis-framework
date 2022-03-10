/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Vector3 } from '@gs.i/utils-math'
import { Timeline } from 'ani-timeline'
import { Projection, GeocentricProjection } from '@polaris.gl/projection'
import { FlyLineProps, FlyLine, DefaultFlyLineProps } from './FlyLine'
import { StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'
import { Grid } from './Grid'
import { OptionalDefault } from './util'

export type FlyLineLayerProps = StandardLayerProps & FlyLineProps & typeof defaultLayerProps

export const defaultLayerProps = {
	...DefaultFlyLineProps,
	duration: 5000,
	delay: 1000,
	repeat: true,
	minHeight: 1,
	maxHeight: 2,
	renderOrder: 0,
	depthTest: true,
	data: [] as any[],
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
export class FlyLineLayer extends StandardLayer<FlyLineLayerProps> {
	props: FlyLineLayerProps

	flyline: FlyLine
	projection: Projection
	geoWrapProjection: Projection
	timeline: Timeline
	geocentricLayer: StandardLayer
	sid: number
	grids: FlyInfo[]
	data: any[]

	constructor(props: OptionalDefault<FlyLineLayerProps, typeof defaultLayerProps> = {}) {
		const _props = {
			...defaultLayerProps,
			...props,
		}
		super(_props)
		this.props = _props

		this.grids = []

		this.listenProps(['renderOrder'], () => {
			this.flyline && (this.flyline.mesh.renderOrder = this.getProp('renderOrder') ?? 0)
		})

		this.listenProps(['depthTest'], () => {
			this.flyline && (this.flyline.mesh.material.depthTest = this.getProp('depthTest') ?? true)
		})

		this.listenProps(['duration', 'delay', 'repeat', 'minHeight', 'maxHeight', 'data'], () => {
			this.props['duration'] = this.getProp('duration')
			this.props['delay'] = this.getProp('delay')
			this.props['repeat'] = this.getProp('repeat')
			this.props['minHeight'] = this.getProp('minHeight')
			this.props['maxHeight'] = this.getProp('maxHeight')
			const data = this.getProp('data')
			if (!data || !data.length) return
			this.updateFlylinesData(this.getProp('data'))
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
		] as const
		this.listenProps(listeningFlylineProps, () => {
			listeningFlylineProps.forEach((key) => {
				// @note this is a problem of ts, key became a union type and props[key] collapsed into `never`
				;(this.props[key] as any) = this.getProp(key)
			})
			const data = this.getProp('data')
			if (!data || !data.length) return

			this.props.pool = Math.max(data.length, this.getProp('pool') ?? 1)
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
		if (this.projection.isSphereProjection && !this.projection.isGeocentricProjection) {
			this.geoWrapProjection = new GeocentricProjection({ center: [0, 0, 0] })
			this.geocentricLayer = new StandardLayer({
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

			const segment = this.getProp('lineSegments') as number
			const padding = segment * (this.getProp('flyPercent') as number)
			const grid = new Grid({
				pointStart: new Vector3().fromArray(posStart),
				pointEnd: new Vector3().fromArray(posEnd),
				segment: segment,
				padding: padding,
				maxHeight: maxHeight ?? this.getProp('maxHeight'),
				minHeight: minHeight ?? this.getProp('minHeight'),
				type: this.geoWrapProjection.isPlaneProjection ? 'onPlane' : 'onSphere',
			})
			grids.push({
				grid: grid,
				duration: duration || (this.getProp('duration') as number),
				delay: delay || (this.getProp('delay') as number) * i,
				repeat: repeat === undefined ? this.getProp('repeat') : repeat,
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

	show(duration = 1000) {
		if (!this.inited) {
			console.warn('can not call .show until layer is inited')
			return
		}

		this.flyline.matr.alphaMode = 'BLEND'
		this.flyline.matr.opacity = 0.0
		this.group.visible = true

		const timeline = this.timeline
		timeline.addTrack({
			id: 'FlylineLayer Show',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				this.flyline.matr.alphaMode = this.getProp('transparent') ? 'BLEND' : 'OPAQUE'
				this.flyline.matr.opacity = this.getProp('opacity') ?? 1
				this.group.visible = true
			},
			onUpdate: (t, p) => {
				this.flyline.matr.opacity = (this.getProp('opacity') ?? 1) * p
			},
		})
	}

	hide(duration = 1000) {
		if (!this.inited) {
			console.warn('can not call .hide until layer is inited')
			return
		}

		this.flyline.matr.alphaMode = 'BLEND'
		this.flyline.matr.opacity = this.getProp('opacity') ?? 1

		const timeline = this.timeline
		timeline.addTrack({
			id: 'FlylineLayer Hide',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				this.flyline.matr.alphaMode = this.getProp('transparent') ? 'BLEND' : 'OPAQUE'
				this.flyline.matr.opacity = this.getProp('opacity') ?? 1
				this.group.visible = false
			},
			onUpdate: (t, p) => {
				this.flyline.matr.opacity = (this.getProp('opacity') ?? 1) * (1 - p)
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
