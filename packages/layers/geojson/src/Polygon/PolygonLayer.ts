/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Color, Box2 } from '@gs.i/utils-math'
/**
 * 基类。
 * 可以使用 Layer，自己添加需要的 view；
 * 也可以使用 StandardLayer，添加好 gsiView 和 htmlView 的 Layer，懒人福音。
 */
import { StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'

/**
 * 内部逻辑依赖
 */
import { FeatureCollection } from '@turf/helpers'
import { PolygonSideLayer } from './PolygonSideLayer'
import { PolygonSurfaceLayer } from './PolygonSurfaceLayer'
import { functionlize, OptionalDefault } from '../utils'

export const defaultProps = {
	name: 'PolygonLayer',
	/**
	 * Base options
	 */
	//
	useTessellation: true,
	tessellation: 3,
	//
	getFillColor: ((feature) => '#689826') as (string | number) | ((feature) => string | number),
	getFillOpacity: ((feature) => 1.0) as number | ((feature) => number),
	getSideColor: ((feature) => '#999999') as (string | number) | ((feature) => string | number),
	sideOpacity: 1.0,
	enableExtrude: true,
	getThickness: ((feature) => 10000) as number | ((feature) => number),
	baseAlt: 0,
	transparent: false,
	doubleSide: false,
	depthTest: true,
	renderOrder: 0,
	/**
	 * Selection params
	 */
	pickable: false,
	selectColor: '#ff0099',
	hoverColor: '#6600ff',
	selectLinesHeight: 0,
	selectLineLevel: 2 as 1 | 2 | 4,
	selectLineWidth: 2,
	selectLineColor: '#FFAE0F',
	hoverLineLevel: 2 as 1 | 2 | 4,
	hoverLineWidth: 1,
	hoverLineColor: '#262626',
	/**
	 * Worker params
	 */
	workersCount: 0,
}
export type PolygonLayerProps = StandardLayerProps &
	typeof defaultProps & {
		data?: FeatureCollection | string
		getColor?: any
	}

export interface SelectionDataType {
	curr: any
	feature: any
}

export class PolygonLayer extends StandardLayer<PolygonLayerProps> {
	props: any
	surfaceLayer: PolygonSurfaceLayer
	sideLayer: PolygonSideLayer

	/**
	 * Picking相关
	 */
	// multiSelect: boolean
	selectColor: Color | undefined
	hoverColor: Color | undefined
	// pickedFeatures: Array<any>
	// hoveredFeature: any

	constructor(props: OptionalDefault<PolygonLayerProps, typeof defaultProps> = {}) {
		const _props: any = {
			...defaultProps,
			...props,
		}
		super(_props)
		this.props = _props

		// this.pickedFeatures = []

		this.addEventListener('init', () => {
			this._init()
		})

		// TODO: refactor highlight
		// /**
		//  * Highilight api
		//  * @param {number[]} dataIndexArr
		//  * @param {{type: 'none' | 'select' | 'hover' }} style
		//  */
		// this.highlightByIndices = (dataIndexArr, style) => {
		// 	const data = this.getProp('data')
		// 	if (!data || !Array.isArray(data.features)) return
		// 	if (!style || !style.type) return

		// 	dataIndexArr.forEach((index) => {
		// 		const feature = data.features[index]
		// 		if (!feature) return

		// 		// Restore last highlight styles
		// 		this._restoreFeatureColor(feature)
		// 		this._restoreHoverLines(feature)
		// 		this._restoreSelectLines(feature)

		// 		switch (style.type) {
		// 			case 'none':
		// 				break
		// 			case 'select':
		// 				this._updateSelectLines(feature)
		// 				if (this.selectColor) {
		// 					this._updateFeatureColor(feature, this.selectColor)
		// 				}
		// 				break
		// 			case 'hover':
		// 				this._updateHoverLines(feature)
		// 				if (this.hoverColor) {
		// 					this._updateFeatureColor(feature, this.hoverColor)
		// 				}
		// 				break
		// 			default:
		// 				console.error(`Polaris::PolygonLayer - Invalid style.type param: ${style}`)
		// 		}
		// 	})
		// }
	}

	private _init() {
		this.listenProps(['selectColor'], () => {
			const c = this.getProp('selectColor')
			if (c) {
				this.selectColor = new Color().set(c)
			} else {
				this.selectColor = undefined
			}
		})

		this.listenProps(['hoverColor'], () => {
			const c = this.getProp('hoverColor')
			if (c) {
				this.hoverColor = new Color().set(c)
			} else {
				this.hoverColor = undefined
			}
		})

		// Calculate feature lnglat bbox and store
		this.listenProps(['data'], () => {
			let data = this.getProp('data')
			if (!data) return

			if (typeof data === 'string') {
				data = JSON.parse(data)
			}

			const geojson = data as Exclude<PolygonLayerProps['data'], undefined | string>

			if (geojson.type !== 'FeatureCollection' || !geojson.features || !geojson.features.length)
				return

			geojson.features.forEach((feature) => {
				calcFeatureBounds(feature)
			})
		})

		this.listenProps(
			[
				'data',
				'getFillColor',
				'getThickness',
				'baseAlt',
				'getFillOpacity',
				'transparent',
				'doubleSide',
				'enableExtrude',
				'useTessellation',
				'tessellation',
				'selectLinesHeight',
				'selectLineLevel',
				'selectLineWidth',
				'selectLineColor',
				'hoverLineLevel',
				'hoverLineWidth',
				'hoverLineColor',
			],
			(e) => {
				let data = this.getProp('data')
				if (typeof data === 'string') {
					data = JSON.parse(data) as FeatureCollection
				}
				const enableExtrude = this.getProp('enableExtrude')
				const getColor = functionlize(this.getProp('getFillColor'))
				const getOpacity = functionlize(this.getProp('getFillOpacity'))
				const getThickness = enableExtrude ? functionlize(this.getProp('getThickness')) : () => 0
				const baseAlt = this.getProp('baseAlt')
				const transparent = this.getProp('transparent')
				const doubleSide = this.getProp('doubleSide')
				const useTessellation = this.getProp('useTessellation')
				const tessellation = this.getProp('tessellation')
				const genSelectLines = this.getProp('pickable')
				const selectLinesHeight = this.getProp('selectLinesHeight')
				const selectLineLevel = this.getProp('selectLineLevel')
				const selectLineWidth = this.getProp('selectLineWidth')
				const selectLineColor = this.getProp('selectLineColor')
				const hoverLineLevel = this.getProp('hoverLineLevel')
				const hoverLineWidth = this.getProp('hoverLineWidth')
				const hoverLineColor = this.getProp('hoverLineColor')
				const workersCount = this.getProp('workersCount')

				if (!this.surfaceLayer) {
					const surfaceLayer = new PolygonSurfaceLayer({
						data,
						getColor,
						getThickness,
						getOpacity,
						transparent,
						baseAlt,
						doubleSide,
						useTessellation,
						tessellation,
						genSelectLines,
						selectLinesHeight,
						selectLineLevel,
						selectLineWidth,
						selectLineColor,
						hoverLineLevel,
						hoverLineWidth,
						hoverLineColor,
						workersCount,
					})
					this.add(surfaceLayer)
					this.surfaceLayer = surfaceLayer
					return
				}

				// Update
				if (e.initial) {
					// Update all
					this.surfaceLayer.updateProps({
						data,
						getColor,
						getThickness,
						getOpacity,
						transparent,
						baseAlt,
						doubleSide,
						useTessellation,
						tessellation,
						genSelectLines,
						selectLinesHeight,
						selectLineLevel,
						selectLineWidth,
						selectLineColor,
						hoverLineLevel,
						hoverLineWidth,
						hoverLineColor,
						workersCount,
					})
				} else if (e.changedKeys.includes('data')) {
					// Update props/data independently
					this.surfaceLayer.updateProps({
						data,
						getColor,
						getThickness,
						getOpacity,
						transparent,
						baseAlt,
						doubleSide,
						useTessellation,
						tessellation,
						genSelectLines,
						selectLinesHeight,
						selectLineLevel,
						selectLineWidth,
						selectLineColor,
						hoverLineLevel,
						hoverLineWidth,
						hoverLineColor,
						workersCount,
					})
					// .then(() => {
					// 	this.surfaceLayer.updateData(data)
					// })
				} else {
					// Update props only
					this.surfaceLayer.updateProps({
						getColor,
						getThickness,
						getOpacity,
						transparent,
						baseAlt,
						doubleSide,
						useTessellation,
						tessellation,
						genSelectLines,
						selectLinesHeight,
						selectLineLevel,
						selectLineWidth,
						selectLineColor,
						hoverLineLevel,
						hoverLineWidth,
						hoverLineColor,
						workersCount,
					})
				}
			}
		)

		this.listenProps(
			[
				'data',
				'getSideColor',
				'getThickness',
				'baseAlt',
				'sideOpacity',
				'transparent',
				'doubleSide',
				'enableExtrude',
			],
			(e) => {
				let data = this.getProp('data')
				if (typeof data === 'string') {
					data = JSON.parse(data) as FeatureCollection
				}
				const enableExtrude = this.getProp('enableExtrude')
				const getColor = functionlize(this.getProp('getSideColor'))
				const getThickness = functionlize(this.getProp('getThickness'))
				const opacity = this.getProp('sideOpacity')
				const baseAlt = this.getProp('baseAlt')
				const transparent = this.getProp('transparent')
				const doubleSide = this.getProp('doubleSide')

				if (enableExtrude) {
					// `SideLayer` must be added first before `SurfaceLayer`
					// It should be rendered before surface to get correct alpha blending result
					if (!this.sideLayer) {
						const sideLayer = new PolygonSideLayer({
							data,
							getColor,
							getThickness,
							opacity,
							transparent,
							baseAlt,
							doubleSide,
						})
						this.add(sideLayer)
						this.sideLayer = sideLayer
						return
					}
					// Update
					if (e.initial) {
						// Update all
						this.sideLayer.updateProps({
							data,
							getColor,
							getThickness,
							opacity,
							transparent,
							baseAlt,
							doubleSide,
						})
					} else if (e.changedKeys.includes('data')) {
						// Update props/data independently
						this.sideLayer.updateProps({
							getColor,
							getThickness,
							opacity,
							transparent,
							baseAlt,
							doubleSide,
						})
						this.sideLayer.updateData(data)
					} else {
						// Update props only
						this.sideLayer.updateProps({
							getColor,
							getThickness,
							opacity,
							transparent,
							baseAlt,
							doubleSide,
						})
					}
				} else if (this.sideLayer) {
					this.remove(this.sideLayer)
				}
			}
		)
	}

	// TODO: refactor picking
	// raycast(polaris, canvasCoords, ndc): PickEvent | undefined {
	// 	if (!this.getProp('pickable')) return
	// 	if (!this.surfaceLayer || !this.surfaceLayer.geom || !this.surfaceLayer.geom.attributes.color)
	// 		return

	// 	const pickResult = (polaris as PolarisGSI).pickObject(this.surfaceLayer.mesh, ndc, {})
	// 	let event: PickEvent | undefined
	// 	if (pickResult.hit && pickResult.intersections && pickResult.intersections.length > 0) {
	// 		const inter0 = pickResult.intersections[0]
	// 		event = {
	// 			distance: inter0.distance as number,
	// 			point: inter0.point as { x: number; y: number; z: number },
	// 			pointLocal: inter0.pointLocal as { x: number; y: number; z: number },
	// 			index: -1,
	// 			object: undefined,
	// 			data: undefined,
	// 		}
	// 		// Find corresponding feature data
	// 		this.surfaceLayer.featIndexRangeMap.forEach((range, feature) => {
	// 			if (
	// 				inter0.index !== undefined &&
	// 				inter0.index >= range[0] / 3 &&
	// 				inter0.index <= range[1] / 3
	// 			) {
	// 				const data: SelectionDataType = {
	// 					curr: feature,
	// 					feature,
	// 				}

	// 				if (event) {
	// 					event.object = this.surfaceLayer.mesh
	// 					event.index = feature.index
	// 					event.data = data
	// 				}
	// 			}
	// 		})
	// 	}

	// 	return event
	// }

	private _updateSelectLines(feature) {
		if (this.surfaceLayer) {
			this.surfaceLayer.updateSelectLineHighlight(feature)
		}
	}

	private _restoreSelectLines(feature) {
		if (this.surfaceLayer) {
			if (feature) {
				// Restore feature
				this.surfaceLayer.restoreSelectLineHighlight(feature)
			} else {
				// Restore all
				this.surfaceLayer.restoreSelectLines()
			}
		}
	}

	private _updateHoverLines(feature) {
		if (this.surfaceLayer) {
			this.surfaceLayer.updateHoverLineHighlight(feature)
		}
	}

	private _restoreHoverLines(feature) {
		if (this.surfaceLayer) {
			if (feature) {
				// Restore feature
				this.surfaceLayer.restoreHoverLineHighlight(feature)
			} else {
				// Restore all
				this.surfaceLayer.restoreHoverLines()
			}
		}
	}

	private _updateFeatureColor(feature: any, color: Color, alpha = 1.0) {
		if (this.surfaceLayer && this.surfaceLayer.geom) {
			this.surfaceLayer.updateFeatureColor(feature, color, alpha)
		}
	}

	private _restoreFeatureColor(feature: any) {
		if (this.surfaceLayer && this.surfaceLayer.geom) {
			this.surfaceLayer.restoreFeatureColor(feature)
		}
	}

	/**
	 * 重写 StandardLayer.onDepthTestChange
	 */
	onDepthTestChange(depthTest: boolean) {
		if (this.surfaceLayer) {
			this.surfaceLayer.updateProps({
				depthTest,
			})
		}
		if (this.sideLayer) {
			this.sideLayer.updateProps({
				depthTest,
			})
		}
	}

	/**
	 * 重写 StandardLayer.onRenderOrderChange
	 */
	onRenderOrderChange(renderOrder: number) {
		if (this.surfaceLayer) {
			this.surfaceLayer.updateProps({
				renderOrder,
			})
		}
		if (this.sideLayer) {
			this.sideLayer.updateProps({
				renderOrder,
			})
		}
	}

	/**
	 * @FIXME show/hide is not working with attribute colors
	 */
	show(duration = 1000) {
		if (!this.inited) {
			console.warn('can not call .show until layer is inited')
			return
		}

		if (this.surfaceLayer) {
			this.surfaceLayer.matr.alphaMode = 'BLEND'
			this.surfaceLayer.matr.opacity = 0.0
		}
		if (this.sideLayer) {
			this.sideLayer.matr.alphaMode = 'BLEND'
			this.sideLayer.matr.opacity = 0.0
		}
		this.group.visible = true

		const timeline = this.timeline
		timeline.addTrack({
			id: 'PolygonLayer Show',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				if (this.surfaceLayer) {
					this.surfaceLayer.matr.alphaMode = this.getProp('transparent') ? 'BLEND' : 'OPAQUE'
					this.surfaceLayer.matr.opacity = 1.0
				}
				if (this.sideLayer) {
					this.sideLayer.matr.alphaMode = this.getProp('transparent') ? 'BLEND' : 'OPAQUE'
					this.sideLayer.matr.opacity = 1.0
				}
				this.group.visible = true
			},
			onUpdate: (t, p) => {
				if (this.surfaceLayer) {
					this.surfaceLayer.matr.opacity = p
				}
				if (this.sideLayer) {
					this.sideLayer.matr.opacity = p
				}
			},
		})
	}

	hide(duration = 1000) {
		if (!this.inited) {
			console.warn('can not call .hide until layer is inited')
			return
		}

		if (this.surfaceLayer) {
			this.surfaceLayer.matr.alphaMode = 'BLEND'
			this.surfaceLayer.matr.opacity = 1.0
		}
		if (this.sideLayer) {
			this.sideLayer.matr.alphaMode = 'BLEND'
			this.sideLayer.matr.opacity = 1.0
		}
		const timeline = this.timeline
		timeline.addTrack({
			id: 'PolygonLayer Hide',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				if (this.surfaceLayer) {
					this.surfaceLayer.matr.alphaMode = this.getProp('transparent') ? 'BLEND' : 'OPAQUE'
					this.surfaceLayer.matr.opacity = 0.0
				}
				if (this.sideLayer) {
					this.sideLayer.matr.alphaMode = this.getProp('transparent') ? 'BLEND' : 'OPAQUE'
					this.sideLayer.matr.opacity = 0.0
				}
				this.group.visible = false
			},
			onUpdate: (t, p) => {
				if (this.surfaceLayer) {
					this.surfaceLayer.matr.opacity = 1 - p
				}
				if (this.sideLayer) {
					this.sideLayer.matr.opacity = 1 - p
				}
			},
		})
	}
}

function calcFeatureBounds(feature) {
	if (feature.properties.bbox !== undefined || !feature.geometry) return
	const box = new Box2()
	const coords = feature.geometry.coordinates
	if (feature.geometry.type === 'MultiPolygon') {
		coords.forEach((coord) => {
			coord.forEach((line) => {
				line.forEach((point) => {
					const x = parseFloat(point[0])
					const y = parseFloat(point[1])
					box.min.x = Math.min(x, box.min.x)
					box.max.x = Math.max(x, box.max.x)
					box.min.y = Math.min(y, box.min.y)
					box.max.y = Math.max(y, box.max.y)
				})
			})
		})
	} else if (feature.geometry.type === 'Polygon') {
		coords.forEach((line) => {
			line.forEach((point) => {
				const x = parseFloat(point[0])
				const y = parseFloat(point[1])
				box.min.x = Math.min(x, box.min.x)
				box.max.x = Math.max(x, box.max.x)
				box.min.y = Math.min(y, box.min.y)
				box.max.y = Math.max(y, box.max.y)
			})
		})
	}
	feature.properties.bbox = box
}
