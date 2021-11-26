/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { STDLayer, STDLayerProps } from '@polaris.gl/layer-std'
import { GLine } from '@gs.i/utils-gline'
import { Color } from '@gs.i/utils-math'
import { Polaris } from '@polaris.gl/schema'

/**
 * 内部逻辑依赖
 */
import { FeatureCollection, Polygon, LineString, Properties } from '@turf/helpers'
import flatten from '@turf/flatten'
import { getGeom, getCoords } from '@turf/invariant'
import polygonToLine from '@turf/polygon-to-line'
import { WorkerManager } from '@polaris.gl/utils-worker-manager'
import GeomWorker from 'worker-loader!../workers/LineGeom'
import { LineLodGroup } from './LineLodGroup'

/**
 * 配置项 interface
 */
export interface LodLineStringProps extends STDLayerProps {
	data?: FeatureCollection
	level?: number
	color?: any
	opacity?: number
	lineWidth?: number
	pointSize?: number
	texture?: string
	baseAlt?: number
	dynamic?: boolean
	usePerspective?: boolean
	useColors?: boolean
	/**
	 * lodZoomLvs需传入每一级lod所对应的最大zoom值
	 * eg. [5, 10, 15, 20, 25, ...]
	 */
	lodZoomLvs?: Array<number>
	/**
	 * lodPercentages代表每个lod对应原始线段的精细程度[0~1]
	 * eg. [5, 10, 15, 20, 25, ...]
	 */
	lodPercentages?: Array<number>
	/**
	 * Open debug mode
	 */
	debug?: boolean
}

const defaultProps: LodLineStringProps = {
	// GLine api
	level: 2,
	color: '#03A9F4',
	opacity: 1.0,
	lineWidth: 10,
	pointSize: 5,
	usePerspective: false,
	useColors: false,
	dynamic: false,
	baseAlt: 0,
	lodZoomLvs: [5, 10, 15],
	lodPercentages: [0.1, 0.3, 0.7],
	debug: false,
}

const textDecoder = new TextDecoder('utf-8')

export class LodLineStringLayer extends STDLayer {
	glineGroup: LineLodGroup

	private _workerManager: WorkerManager

	constructor(props) {
		super(props)

		this.setProps({
			...defaultProps,
			...props,
		})

		this.name = this.group.name = 'LineStringLayer'

		this.glineGroup = new LineLodGroup()

		this.onViewChange = (cam, polaris) => {
			this.glineGroup.update(cam)
		}
	}

	init(projection, timeline, polaris) {
		// Init WorkerManager
		// this.listenProps(['workersCount'], () => {
		// 	const count = this.getProps('workersCount')
		// 	if (count > 0) {
		// 		const workers: Worker[] = []
		// 		for (let i = 0; i < count; i++) {
		// 			workers.push(new GeomWorker())
		// 		}
		// 		this._workerManager = new WorkerManager(workers)
		// 	}
		// })

		this._workerManager = new WorkerManager([new GeomWorker()])

		this.listenProps(
			[
				'level',
				'lineWidth',
				'pointSize',
				'color',
				'opacity',
				'texture',
				'usePerspective',
				'useColors',
				'dynamic',
				'lodZoomLvs',
				'lodPercentages',
			],
			() => {
				if (this.glineGroup) {
					this.glineGroup.forEach((gline) => this.group.remove(gline))
					this.glineGroup.clear()
				}
				const lodLvs = this.getProps('lodZoomLvs')
				const percentages = this.getProps('lodPercentages')
				if (lodLvs.length !== percentages.length) {
					console.error(
						'Polaris::LodLineStringLayer - Length of `lodZoomLvs` and `lodPercentages` are different, check them first. '
					)
					return
				}
				for (let i = 0; i < lodLvs.length; i++) {
					const color = this._getLineColor()
					const gline = new GLine({
						level: this.getProps('level'),
						lineWidth: this.getProps('lineWidth'),
						pointSize: this.getProps('pointSize'),
						color: color,
						opacity: this.getProps('opacity'),
						texture: this.getProps('texture'),
						usePerspective: this.getProps('usePerspective'),
						useColors: this.getProps('useColors'),
						dynamic: this.getProps('dynamic'),
						resolution: {
							x: polaris.canvasWidth ?? polaris.width,
							y: polaris.canvasHeight ?? polaris.height,
						},
					})
					this.group.add(gline)
					this.glineGroup.add(gline, lodLvs[i])
				}
			}
		)

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
				'lodZoomLvs',
				'lodPercentages',
			],
			async () => {
				const data: FeatureCollection<any> = this.getProps('data')
				const baseAlt = this.getProps('baseAlt')

				if (!(data && Array.isArray(data.features))) {
					return
				}

				/**
				 * Building geojson lods:
				 * 1. Transfer to worker
				 * 2. Get generated geojsons back
				 * 3. Build lod meshes
				 */
				const percentages = this.getProps('lodPercentages')
				const res = await this._workerManager.execute({
					data: {
						task: 'lods',
						geojson: data,
						percentages: percentages,
					},
				})

				res.results.forEach((lod, i) => {
					const content = lod[0].content
					if (!content) return

					let geojson
					if (content.buffer !== undefined) {
						geojson = JSON.parse(textDecoder.decode(content))
					} else {
						geojson = content
					}

					// Data prep
					const positions: number[][] = []
					// 拍平得到lineString的数组
					const flattened = flatten(geojson)
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
					const gline = this.glineGroup.get(i).mesh as GLine
					gline.geometry.updateData({
						positions: positions,
					})
				})

				// Update first frame
				this.glineGroup.update(polaris.cameraProxy)
			}
		)

		this.onViewChange = (cameraProxy, polaris) => {
			if (this.glineGroup) {
				const p = polaris as Polaris
				const w = p.canvasWidth
				const h = p.canvasHeight
				this.glineGroup.forEach((mesh) => {
					const gline = mesh as GLine
					const originRes = gline.material.config['resolution']
					if (originRes.x !== w || originRes.y !== h) {
						gline.material.config['resolution'] = {
							x: p.canvasWidth,
							y: p.canvasHeight,
						}
					}
				})
			}
		}
	}

	_getLineColor() {
		if (this.getProps('debug')) {
			const r = Math.round(0x88 + Math.random() * 0x77).toString(16)
			const g = Math.round(0x88 + Math.random() * 0x77).toString(16)
			const b = Math.round(0x88 + Math.random() * 0x77).toString(16)
			return new Color(`#${r}${g}${b}`)
		} else {
			return new Color(this.getProps('color'))
		}
	}

	// async show(duration = 1000) {
	// 	const transparent = this.gline.material.alphaMode === 'BLEND'
	// 	this.gline.material.alphaMode = 'BLEND'
	// 	this.gline.material.opacity = 0.0
	// 	this.group.visible = true

	// 	const timeline = await this.getTimeline()
	// 	timeline.addTrack({
	// 		id: 'FlylineLayer Show',
	// 		startTime: timeline.currentTime,
	// 		duration: duration,
	// 		onStart: () => {},
	// 		onEnd: () => {
	// 			this.gline.material.alphaMode = transparent ? 'BLEND' : 'OPAQUE'
	// 			this.gline.material.opacity = this.getProps('opacity')
	// 			this.group.visible = true
	// 		},
	// 		onUpdate: (t, p) => {
	// 			this.gline.material.opacity = this.getProps('opacity') * p
	// 		},
	// 	})
	// }

	// async hide(duration = 1000) {
	// 	this.gline.material.alphaMode = 'BLEND'
	// 	this.gline.material.opacity = this.getProps('opacity')

	// 	const timeline = await this.getTimeline()
	// 	timeline.addTrack({
	// 		id: 'FlylineLayer Hide',
	// 		startTime: timeline.currentTime,
	// 		duration: duration,
	// 		onStart: () => {},
	// 		onEnd: () => {
	// 			this.gline.material.alphaMode = this.getProps('transparent') ? 'BLEND' : 'OPAQUE'
	// 			this.gline.material.opacity = this.getProps('opacity')
	// 			this.group.visible = false
	// 		},
	// 		onUpdate: (t, p) => {
	// 			this.gline.material.opacity = this.getProps('opacity') * (1 - p)
	// 		},
	// 	})
	// }
}
