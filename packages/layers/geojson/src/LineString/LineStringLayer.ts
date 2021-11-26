/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { STDLayer, STDLayerProps } from '@polaris.gl/layer-std'
import { GLine } from '@gs.i/utils-gline'
import { Color } from '@gs.i/utils-math'
import { Mesh } from '@gs.i/frontend-sdk'

/**
 * 内部逻辑依赖
 */
import { FeatureCollection, Polygon, LineString, Properties } from '@turf/helpers'
import flatten from '@turf/flatten'
import { getGeom, getCoords } from '@turf/invariant'
import polygonToLine from '@turf/polygon-to-line'
import { Polaris } from '@polaris.gl/schema'

/**
 * 配置项 interface
 */
export interface LineStringProps extends STDLayerProps {
	level?: number
	color?: any
	opacity?: number
	lineWidth?: number
	pointSize?: number
	texture?: string
	baseAlt?: number
	usePerspective?: boolean
	useColors?: boolean
	dynamic?: boolean
	data?: FeatureCollection
}

const defaultProps: LineStringProps = {
	// GLine api
	level: 2,
	color: '#03A9F4',
	opacity: 1.0,
	lineWidth: 10,
	pointSize: 5,
	usePerspective: false,
	useColors: false,
	dynamic: true,
	baseAlt: 0,
}

export class LineStringLayer extends STDLayer {
	gline: GLine
	mesh: GLine

	constructor(props) {
		super(props)

		this.setProps({
			...defaultProps,
			...props,
		})

		this.name = this.group.name = 'LineStringLayer'
	}

	init(projection, timeline, polaris) {
		this.listenProps(
			[
				'data',
				'baseAlt',
				'level',
				'pointSize',
				'texture',
				'usePerspective',
				'useColors',
				'dynamic',
			],
			() => {
				const data: FeatureCollection<any> = this.getProps('data')
				const baseAlt = this.getProps('baseAlt')

				if (!(data && Array.isArray(data.features))) {
					return
				}

				// Recreation of gline
				if (this.gline) {
					this.group.remove(this.gline)
				}
				this.gline = new GLine({
					level: this.getProps('level'),
					lineWidth: this.getProps('lineWidth'),
					pointSize: this.getProps('pointSize'),
					color: new Color(this.getProps('color')),
					opacity: this.getProps('opacity'),
					texture: this.getProps('texture'),
					resolution: {
						x: polaris.canvasWidth ?? polaris.width,
						y: polaris.canvasHeight ?? polaris.height,
					},
					usePerspective: this.getProps('usePerspective'),
					useColors: this.getProps('useColors'),
					dynamic: this.getProps('dynamic'),
				})
				this.mesh = this.gline
				this.group.add(this.mesh)

				// Data prep
				const positions: number[][] = []
				// 拍平得到lineString的数组
				const flattened = flatten(data)
				// 删除空geometry
				flattened.features = flattened.features.filter((i) => {
					return i.geometry
				})

				flattened.features.forEach((feature: any) => {
					let geom: any = getGeom(feature)
					if (geom) {
						// 如果Geojson数据是Polygon类型，需要先转换为LineString
						if (geom.type === 'Polygon') {
							const line: any = polygonToLine(feature)
							geom = getGeom(line)
						} else if (geom.type === 'MultiPolygon') {
							const line: any = polygonToLine(feature)
							geom = line.features[0].geometry
						}
						const positionsSub: number[] = []
						const coords = getCoords(geom)
						coords.forEach((coord) => {
							const xyz = projection.project(coord[0], coord[1], baseAlt)
							positionsSub.push(...xyz)
						})
						positions.push(positionsSub)
					}
				})

				this.gline.geometry.updateData({
					positions: positions,
				})
			}
		)

		this.listenProps(['color', 'opacity', 'lineWidth'], () => {
			if (this.gline) {
				this.gline.material.config['color'] = new Color(this.getProps('color'))
				this.gline.material.config['opacity'] = this.getProps('opacity')
				this.gline.material.config['lineWidth'] = this.getProps('lineWidth')
			}
		})

		this.onViewChange = (cameraProxy, polaris) => {
			if (this.gline) {
				const p = polaris as Polaris
				const w = p.canvasWidth
				const h = p.canvasHeight
				const originRes = this.gline.material.config['resolution']
				if (originRes.x !== w || originRes.y !== h) {
					this.gline.material.config['resolution'] = {
						x: p.canvasWidth,
						y: p.canvasHeight,
					}
				}
			}
		}
	}

	async show(duration = 1000) {
		const transparent = this.gline.material.alphaMode === 'BLEND'
		this.gline.material.alphaMode = 'BLEND'
		this.gline.material.opacity = 0.0
		this.group.visible = true

		const timeline = await this.getTimeline()
		timeline.addTrack({
			id: 'FlylineLayer Show',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				this.gline.material.alphaMode = transparent ? 'BLEND' : 'OPAQUE'
				this.gline.material.opacity = this.getProps('opacity')
				this.group.visible = true
			},
			onUpdate: (t, p) => {
				this.gline.material.opacity = this.getProps('opacity') * p
			},
		})
	}

	async hide(duration = 1000) {
		this.gline.material.alphaMode = 'BLEND'
		this.gline.material.opacity = this.getProps('opacity')

		const timeline = await this.getTimeline()
		timeline.addTrack({
			id: 'FlylineLayer Hide',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				this.gline.material.alphaMode = this.getProps('transparent') ? 'BLEND' : 'OPAQUE'
				this.gline.material.opacity = this.getProps('opacity')
				this.group.visible = false
			},
			onUpdate: (t, p) => {
				this.gline.material.opacity = this.getProps('opacity') * (1 - p)
			},
		})
	}
}
