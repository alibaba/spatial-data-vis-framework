/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'
import { GLine, GLineMatrConfig } from '@gs.i/frontend-gline'
import { Color } from '@gs.i/utils-math'

/**
 * 内部逻辑依赖
 */
import { FeatureCollection, Polygon, LineString, Properties } from '@turf/helpers'
import flatten from '@turf/flatten'
import { getGeom, getCoords } from '@turf/invariant'
import polygonToLine from '@turf/polygon-to-line'
import { WorkerManager } from '@polaris.gl/utils-worker-manager'
import { createWorkers } from '../workers/LineGeomWorkerFactory'
import { LineLodGroup } from './LineLodGroup'
import { specifyTexture } from '@gs.i/utils-specify'
import { OptionalDefault } from '../utils'

/**
 * 配置项 interface
 */
export type LodInfo = {
	/**
	 * 需要每一级lod所对应的最大zoom值
	 * eg. [5, 10, 15, 20, 25, ...]
	 */
	zoom: number
	/**
	 * [0~1] 代表每个lod对应原始线段的精细程度
	 * eg. [0.1, 0.3, 0.5, 0.7, ...]
	 */
	percentage: number
}

const defaultProps = {
	name: 'LodLineStringLayer',
	// GLine api
	level: 2 as GLineMatrConfig['level'],
	color: '#03A9F4',
	opacity: 1.0,
	lineWidth: 10,
	pointSize: 5,
	usePerspective: false,
	useColors: false,
	dynamic: false,
	baseAlt: 0,
	/**
	 * 生成lods所需信息
	 */
	lods: [
		{
			zoom: 100,
			percentage: 1.0,
		},
	] as LodInfo[],
	/**
	 * Open debug mode
	 */
	debug: false,
}

export type LodLineStringProps = StandardLayerProps &
	typeof defaultProps & {
		data?: FeatureCollection
		texture?: string
	}

const textDecoder = new TextDecoder('utf-8')

/**
 * 通过生成多级Line LOD解决过于精细的线条在zoom较远时的artifacts，LODs采用worker线程计算并返回
 * @TODO worker可以返回arraybuffer来进一步提高线程间传输data的效率
 * @LIMIT LODs的显隐只和当前zoom有关，适合于完全俯视视角下的地图浏览，可能不适合于3D空间内过于倾斜时的视角
 *
 * @export
 * @class LodLineStringLayer
 * @extends {StandardLayer}
 */
export class LodLineStringLayer extends StandardLayer<LodLineStringProps> {
	glineGroup: LineLodGroup

	private _workerManager: WorkerManager

	constructor(props: OptionalDefault<LodLineStringProps, typeof defaultProps> = {}) {
		const _props = {
			...defaultProps,
			...props,
		}
		super(_props)

		this.glineGroup = new LineLodGroup()

		this.addEventListener('viewChange', (e) => {
			if (this.glineGroup) {
				// Update resolution
				const p = e.polaris
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
				// Update lods
				this.glineGroup.update(e.cameraProxy)
			}
		})

		this.addEventListener('init', (e) => {
			const polaris = e.polaris
			const projection = e.projection
			const timeline = e.timeline

			this._workerManager = new WorkerManager(createWorkers(1))

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
					'lods',
				],
				() => {
					if (this.glineGroup) {
						this.glineGroup.forEach((gline) => this.group.remove(gline))
						this.glineGroup.clear()
					}
					const textureURL = this.getProp('texture')
					const texture = textureURL
						? specifyTexture({
								image: { uri: textureURL },
								sampler: undefined,
						  })
						: undefined
					const lodInfos = this.getProp('lods') as LodInfo[]
					for (let i = 0; i < lodInfos.length; i++) {
						const color = this._getLineColor()
						const gline = new GLine({
							level: this.getProp('level'),
							lineWidth: this.getProp('lineWidth'),
							pointSize: this.getProp('pointSize'),
							color: color,
							opacity: this.getProp('opacity'),
							texture,
							usePerspective: this.getProp('usePerspective'),
							useColors: this.getProp('useColors'),
							dynamic: this.getProp('dynamic'),
							resolution: {
								x: polaris.canvasWidth ?? polaris.width,
								y: polaris.canvasHeight ?? polaris.height,
							},
						})
						this.group.add(gline)
						this.glineGroup.add(gline, lodInfos[i].zoom)
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
					'lods',
				],
				// TODO: not safe, props may change during this async calling
				async () => {
					const data: FeatureCollection<any> | undefined = this.getProp('data')
					if (!(data && Array.isArray(data.features))) {
						return
					}
					const baseAlt = this.getProp('baseAlt')

					/**
					 * Building geojson lods:
					 * 1. Transfer to worker
					 * 2. Get generated geojsons back (might be arraybuffer)
					 * 3. Build lod meshes
					 */
					const lodInfos = this.getProp('lods') as LodInfo[]
					const percentages = lodInfos.map((info) => info.percentage)
					const res = await this._workerManager.execute({
						data: {
							task: 'lods',
							geojson: data,
							percentages: percentages,
						},
						transferables: undefined,
					})

					res.results.forEach((lod, i) => {
						const content = lod
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
		})
	}

	_getLineColor() {
		if (this.getProp('debug')) {
			const r = Math.round(0x88 + Math.random() * 0x77).toString(16)
			const g = Math.round(0x88 + Math.random() * 0x77).toString(16)
			const b = Math.round(0x88 + Math.random() * 0x77).toString(16)
			return new Color(`#${r}${g}${b}`)
		} else {
			return new Color(this.getProp('color'))
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
	// 			this.gline.material.opacity = this.getProp('opacity')
	// 			this.group.visible = true
	// 		},
	// 		onUpdate: (t, p) => {
	// 			this.gline.material.opacity = this.getProp('opacity') * p
	// 		},
	// 	})
	// }

	// async hide(duration = 1000) {
	// 	this.gline.material.alphaMode = 'BLEND'
	// 	this.gline.material.opacity = this.getProp('opacity')

	// 	const timeline = await this.getTimeline()
	// 	timeline.addTrack({
	// 		id: 'FlylineLayer Hide',
	// 		startTime: timeline.currentTime,
	// 		duration: duration,
	// 		onStart: () => {},
	// 		onEnd: () => {
	// 			this.gline.material.alphaMode = this.getProp('transparent') ? 'BLEND' : 'OPAQUE'
	// 			this.gline.material.opacity = this.getProp('opacity')
	// 			this.group.visible = false
	// 		},
	// 		onUpdate: (t, p) => {
	// 			this.gline.material.opacity = this.getProp('opacity') * (1 - p)
	// 		},
	// 	})
	// }
}
