/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */
import { PolarisGSI, StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'
import { Color, Vector2 } from '@gs.i/utils-math'
import { Track } from 'ani-timeline'
import { SimplifiedMarker } from './SimplifiedMarker'
import { OptionalDefault } from './utils'

export interface LabelLayerProps extends StandardLayerProps {
	baseAlt: number
	zIndex: number
	/**
	 * 是否开启根据背景色自动反色
	 * 开启此项后文字颜色和shadow只固定为黑白两色
	 */
	inverseByBgColor: boolean
	/**
	 * 开启自动反色后，需要输入获取背景色方法
	 */
	getBgColor?: (number | string) | ((feature: any) => number | string)
	/**
	 * 反白双色设置
	 */
	inverseColors: {
		color: string
		shadow: string
	}
	/**
	 * text互相重叠时的抽样比较器，a b 代表 feature item
	 * 返回 <0 表示 a显示b隐藏，返回 >0 表示 b显示a隐藏，返回 0 表示 不改变当前显隐状态
	 */
	markerComparator: (a: any, b: any) => number
	/**
	 * 做重叠判断时使用的box pixel enlarge value
	 */
	markerCompareEnlargePx: number
	/**
	 * 文字dom相关参数
	 */
	text_family: string
	text_weight: string
	text_size: number
	text_color: string
	text_backgroundColor: string
	text_translate_x: number // -1 ~ 1
	text_translate_y: number // -1 ~ 1
	text_shadow_px: number
	text_shadow_color: string

	// TODO: @qianxun type these
	text_background?
	text_marginLeft?
	text_marginTop?

	/**
	 * 自定义text style方法
	 * eg. (dataItem) => { return { styleA: '', styleB: '', ... } }
	 */
	customTextStyle: any
	/**
	 * 显影动画时长
	 */
	showHideDuration: number
	/**
	 * debug: draw boxes
	 */
	debug: boolean

	data?: any
}

export const defaultProps = {
	baseAlt: 0,
	zIndex: 0,
	inverseByBgColor: false,
	inverseColors: {
		color: 'rgba(242, 244, 247, 0.95)',
		shadow: 'rgba(44, 53, 66, 0.95)',
	},
	markerComparator: (a, b) => 0,
	markerCompareEnlargePx: 0,
	text_family: 'SimSun',
	text_weight: 'normal',
	text_size: 12, // 字号
	text_color: 'rgba(0,0,0,1)', // 颜色
	text_backgroundColor: 'transparent', // 背景色
	text_translate_x: 0, // -1 ~ 1
	text_translate_y: 0, // -1 ~ 1
	text_shadow_px: 0,
	text_shadow_color: '#000000',
	customTextStyle: undefined,
	showHideDuration: 200,
	debug: false,
}

defaultProps as LabelLayerProps // type check only

export type TextColor = {
	from: number
	to: number
	color: string
	shadow: string
}

const ChineseCharPattern = new RegExp('[\u4E00-\u9FA5]+')

export class LabelLayer extends StandardLayer<LabelLayerProps> {
	greyToTextColor: [TextColor, TextColor]

	/**
	 * Canvas DOM
	 */
	canvas: HTMLCanvasElement

	/**
	 * Canvas drawing 2d context
	 */
	declare ctx: CanvasRenderingContext2D

	/**
	 * Marker locators
	 */
	markers: (SimplifiedMarker | undefined)[]

	/**
	 * Canvas resolution ratio
	 * @Note Always render at Nth resolution
	 */
	ratio: number

	/**
	 * Temp vars
	 */
	_size: Vector2

	_currInvisibles: SimplifiedMarker[]

	_currVisibles: SimplifiedMarker[]

	_animTracks: Track[] = []

	constructor(props: Partial<LabelLayerProps> = {}) {
		const _props = {
			...defaultProps,
			...props,
		}
		super(_props)

		this.canvas = document.createElement('canvas')
		this.markers = []
		this.ratio = 2
		this._size = new Vector2()
		this._currInvisibles = []
		this._currVisibles = []
		this.greyToTextColor = [
			{
				from: 0.0,
				to: 170 / 255,
				color: 'rgba(242, 244, 247, 0.95)',
				shadow: 'rgba(44, 53, 66, 0.95)',
			},
			{
				from: 170 / 255,
				to: 1.0,
				color: 'rgba(44, 53, 66, 0.95)',
				shadow: 'rgba(242, 244, 247, 0.95)',
			},
		]

		this.addEventListener('init', (e) => {
			this._init(e.projection, e.timeline, e.polaris)
		})
	}

	private _init(projection, timeline, polaris) {
		const p = polaris as PolarisGSI

		let viewChangedFrames = 0
		let visNeedsCheck = true
		let lastZoom = -1

		// Canvas init
		this.listenProps(['zIndex'], () => {
			this._createCanvas(p)
		})

		this.listenProps(
			[
				'data',
				'baseAlt',
				'inverseByBgColor',
				'getBgColor',
				'text_family',
				'text_weight',
				'text_size',
				'text_color',
				'text_background',
				'text_marginLeft',
				'text_marginTop',
				'text_translate_x',
				'text_translate_y',
				'text_shadow_px',
				'text_shadow_color',
				'customTextStyle',
			],
			() => {
				this._createLocators()
				viewChangedFrames = 0
				visNeedsCheck = true
				this._currInvisibles = []
				this._currVisibles = []
			}
		)

		this.listenProps(['markerComparator', 'markerCompareEnlargePx'], () => {
			const comparator = this.getProps('markerComparator')
			if (!comparator) return
			this.markers.sort((a, b) => {
				return comparator(a ? a.feature : undefined, b ? b.feature : undefined)
			})
			viewChangedFrames = 0
			visNeedsCheck = true
			this._currInvisibles = []
			this._currVisibles = []
		})

		this.onViewChange = (cam, p) => {
			const polaris = p as PolarisGSI

			// viewChange固定几帧之后再进行label抽样测试
			viewChangedFrames = 0

			// 只有zoom改变时才测试
			if (cam.zoom !== lastZoom) {
				visNeedsCheck = true
			}

			// update width/height
			if (this.canvas) {
				if (
					this.canvas.clientWidth !== polaris.width ||
					this.canvas.clientHeight !== polaris.height
				) {
					this.canvas.style.width = polaris.width + 'px'
					this.canvas.style.height = polaris.height + 'px'
					this.canvas.width = polaris.width * this.ratio
					this.canvas.height = polaris.height * this.ratio
				}
			}
		}

		const framesBeforeStable = 3
		this.onBeforeRender = () => {
			const cam = p.cameraProxy
			if (viewChangedFrames < framesBeforeStable) {
				this._calcMarkersBBox()
			}

			// only when static frames > N && view changed, do marker visibility tests
			// const frames = Math.round(1000 / this.getProps('showHideDuration'))
			if (++viewChangedFrames > framesBeforeStable && visNeedsCheck) {
				this._setMarkersVisibility(timeline)
				visNeedsCheck = false
				if (cam.zoom !== lastZoom) {
					lastZoom = cam.zoom
				}
			}
		}

		// Draw labels
		this.onAfterRender = () => {
			this._clearCanvas()
			this._drawLabels()
		}
	}

	private _createCanvas(polaris) {
		this.canvas.width = polaris.width * this.ratio
		this.canvas.height = polaris.height * this.ratio
		this.canvas.style.width = polaris.width + 'px'
		this.canvas.style.height = polaris.height + 'px'
		this.canvas.style.position = 'absolute'
		this.canvas.style.zIndex = `${this.getProps('zIndex') ?? 0}`
		this.canvas.style.pointerEvents = 'none'
		const ctx = this.canvas.getContext('2d')
		if (!ctx) {
			console.error(
				'CanvasLabelLayer - Cannot get context, plz check browser or environment first. '
			)
			return
		}
		this.ctx = ctx
		this.ctx.textAlign = 'left'
		this.ctx.textBaseline = 'top'
		this.ctx.shadowBlur = 0
		this.element.appendChild(this.canvas)
	}

	private _clearCanvas() {
		if (!this.ctx) return
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
	}

	private _drawLabels() {
		if (!this.ctx) return
		const ctx = this.ctx
		const cw = this.canvas.clientWidth
		const ch = this.canvas.clientHeight
		const w = this.canvas.width
		const h = this.canvas.height
		this.markers.forEach((marker) => {
			if (!marker || marker.labelVisible === false) return

			const style = marker.style

			// correct screenXY from raw w/h to high ratio w/h
			const xy = [(marker.screenXY.x / cw) * w, (marker.screenXY.y / ch) * h]
			const x = xy[0] + marker.translateX * style.textWidth * this.ratio
			const y = xy[1] + marker.translateY * style.textHeight * this.ratio

			// check if bbox is out of canvas
			const size = marker.labelBox.getSize(this._size)
			const leftx = marker.labelBox.min.x * this.ratio
			const lefty = marker.labelBox.min.y * this.ratio
			const rightx = leftx + size.x * this.ratio
			const righty = lefty + size.y * this.ratio
			if (leftx > w || lefty > h || rightx < 0 || righty < 0) return

			// start drawing
			ctx.globalAlpha = marker.alpha ?? 1.0

			ctx.font = `${style.text_weight} ${style.text_size * this.ratio}px ${style.text_family}`

			// stroke text shadow
			ctx.lineWidth = style.text_shadow_px * 2 * this.ratio
			ctx.strokeStyle = style.text_shadow_color
			ctx.strokeText(marker.label, x, y)

			// fill text
			ctx.fillStyle = style.text_color
			ctx.fillText(marker.label, x, y)

			if (this.getProps('debug')) {
				ctx.strokeStyle = '#666'
				ctx.lineWidth = this.ratio
				ctx.strokeRect(leftx, lefty, rightx - leftx, righty - lefty)
			}
		})
	}

	_createLocators() {
		const data = this.getProps('data')
		const baseAlt = this.getProps('baseAlt')
		const textWeightValues = ['none', 'normal', 'italic', 'oblique', 'bold', 'bolder']
		const markerProps: any[] = []
		for (let i = 0; i < data.length; i++) {
			const item = data[i]
			const lng = item.lng
			const lat = item.lat
			const label = item.name ?? ''
			const feature = item.feature
			const alt = baseAlt ?? 0

			const layerStyle: any = {}
			layerStyle.text_size = this.getProps('text_size') ?? 12
			layerStyle.text_family = this.getProps('text_family') ?? 'SimHei'
			layerStyle.text_weight = this.getProps('text_weight') ?? 'normal'
			layerStyle.text_background = this.getProps('text_background') ?? 'transparent'
			layerStyle.text_translate_x = this.getProps('text_translate_x') ?? 0
			layerStyle.text_translate_y = this.getProps('text_translate_y') ?? 0
			layerStyle.text_shadow_px = this.getProps('text_shadow_px') ?? 0
			const textShadowColors = this._getTextAndShadowColor(item, this.getProps('getBgColor'))
			layerStyle.text_color = textShadowColors.text
			layerStyle.text_shadow_color = textShadowColors.shadow

			// check text_weight value
			if (textWeightValues.indexOf(layerStyle.text_weight) < 0) {
				const values = textWeightValues.join('|')
				console.error(`BatchLabelLayer - Invalid text_weight value, expected values: ${values}`)
				layerStyle.text_weight = 'normal'
			}

			let finalStyle
			const styleFn = this.getProps('customTextStyle')
			if (styleFn) {
				// overwrite layerStyle with custom style
				finalStyle = {
					...layerStyle,
					...styleFn(item),
				}
			} else {
				finalStyle = layerStyle
			}

			finalStyle.textWidth = this._calcTextWidth(label, layerStyle.text_size)
			finalStyle.textHeight = layerStyle.text_size

			markerProps.push({
				lng,
				lat,
				alt,
				label,
				style: finalStyle,
				feature,
			})
		}

		// add new markers
		// this.markers.forEach(marker => {
		// 	this.remove(marker)
		// })
		// this.markers.length = 0
		// markerProps.forEach(props => {
		// 	const marker = new SimplifiedMarker(props)
		// 	this.add(marker)
		// 	this.markers.push(marker)
		// })

		// add new markers
		const length = Math.max(markerProps.length, this.markers.length)
		const newMarkers: SimplifiedMarker[] = []
		for (let i = 0; i < length; i++) {
			const props = markerProps[i]
			const marker = this.markers[i]

			// deal with markers dont need, delete
			if (!props && marker) {
				this.remove(marker)
				this.markers[i] = undefined
				continue
			}

			if (!marker) {
				const marker = new SimplifiedMarker(props)
				this.add(marker)
				newMarkers.push(marker)
			} else {
				// 复用marker，减少gc
				marker.update(props)
				newMarkers.push(marker)
			}
		}
		this.markers = newMarkers

		//
		const comparator = this.getProps('markerComparator')
		if (comparator) {
			this.markers.sort((a, b) => {
				return comparator(a ? a.feature : undefined, b ? b.feature : undefined)
			})
		}
	}

	private _calcMarkersBBox() {
		this.markers.forEach((marker) => {
			if (!marker) return
			this._calcLabelBox(marker, marker.labelBox, this.getProps('markerCompareEnlargePx'))
		})
	}

	private _setMarkersVisibility(timeline) {
		const duration = this.getProps('showHideDuration')
		const markers = this.markers
		const lastInvisibles = new Set<SimplifiedMarker>()
		const lastVisibles = new Set<SimplifiedMarker>()
		const needsHide = new Set<SimplifiedMarker>()
		markers.forEach((marker) => {
			if (!marker) return
			if (marker.labelVisible === false) {
				lastInvisibles.add(marker)
			} else {
				lastVisibles.add(marker)
			}
			marker.labelVisible = true
		})
		// check markers bbox intersections with each other
		// hide the less important one if two boxes are intersected
		for (let i = 0; i < markers.length; i++) {
			const a = markers[i]
			if (!a) continue
			if (a.labelVisible === false) continue
			for (let j = i + 1; j < markers.length; j++) {
				const b = markers[j]
				if (!b) continue
				if (b.labelVisible === false) continue
				// Intersection detection
				if (a.labelBox.intersectsBox(b.labelBox)) {
					b.labelVisible = false
					needsHide.add(b)
				}
			}
		}
		// show/hide animation
		needsHide.forEach((marker) => {
			if (lastVisibles.has(marker)) {
				this._hideMarker(marker, timeline, duration)
			}
		})
		lastInvisibles.forEach((marker) => {
			if (marker.labelVisible === true) {
				this._showMarker(marker, timeline, duration)
			}
		})
	}

	/**
	 *
	 *
	 * @param {*} timeline
	 * @param {boolean} isZoomingCloser indicates whether the camera is zooming closer or further
	 * @memberof BatchLabelLayer
	 */
	private _setMarkersVisibility2(timeline, isZoomingCloser) {
		const duration = this.getProps('showHideDuration')
		const comparator = this.getProps('markerComparator')
		const markers = this.markers
		// initial state setting
		if (this._currVisibles.length === 0 && this._currInvisibles.length === 0) {
			for (let i = 0; i < markers.length; i++) {
				const marker = markers[i]
				if (!marker) continue
				if (i === 0) {
					// add the first marker to visible list because it will always be shown
					this._currVisibles.push(marker)
					this._showMarker(marker, timeline, duration)
					continue
				}
				this._currInvisibles.push(marker)
			}
		}
		if (isZoomingCloser) {
			// zoom is getting bigger
			// currVisibles remain visible
			// currInvisibles are going to compare to currVisibles
			const needsDelete: any[] = []
			this._currInvisibles.forEach((invis, i) => {
				let canBeShown = true
				this._currVisibles.forEach((vis) => {
					if (invis.labelBox.intersectsBox(vis.labelBox)) {
						canBeShown = false
						return
					}
				})
				if (canBeShown) {
					this._currVisibles.push(invis)
					// arr.splice(i, 1)
					needsDelete.push(invis)
					this._showMarker(invis, timeline, duration)
				}
			})
			needsDelete.forEach((marker) => {
				this._currInvisibles.splice(this._currInvisibles.indexOf(marker), 1)
			})
			// this._currVisibles.sort((a, b) => {
			// 	return comparator(a.feature, b.feature)
			// })
		} else {
			// zoom is getting smaller
			// currInvisibles remain invisible
			// currVisibles are going to compare to each other
			const priors: SimplifiedMarker[] = []
			const needsDelete: SimplifiedMarker[] = []
			this._currVisibles.forEach((vis, i) => {
				let canBeShown = true
				priors.forEach((prior) => {
					if (vis.labelBox.intersectsBox(prior.labelBox)) {
						canBeShown = false
						return
					}
				})
				if (canBeShown) {
					// Become a comparator for coming markers
					priors.push(vis)
				} else {
					// arr.splice(i, 1)
					needsDelete.push(vis)
					this._currInvisibles.push(vis)
					this._hideMarker(vis, timeline, duration)
				}
			})
			needsDelete.forEach((marker) => {
				this._currVisibles.splice(this._currVisibles.indexOf(marker), 1)
			})
			// this._currInvisibles.sort((a, b) => {
			// 	return comparator(a.feature, b.feature)
			// })
		}
	}

	// NOTE: 不要使用boundingClientRect，因为浏览器更新不及时，可能出现跟不上visibility更新的情况
	private _calcLabelBox(marker, box, enlarge = 0) {
		const screenXY = marker.screenXY
		const translateX = marker.translateX
		const translateY = marker.translateY
		const width = marker.style.textWidth
		const height = marker.style.textHeight
		box.min.set(screenXY.x + translateX * width, screenXY.y + translateY * height)
		box.max.set(box.min.x + width, box.min.y + height)
		box.expandByScalar(enlarge)
		return box
	}

	private _getTextAndShadowColor(dataItem, getBgColorCB) {
		const result = {
			text: '',
			shadow: '',
		}
		const bgColorVal = getBgColorCB ? getBgColorCB(dataItem) : undefined
		if (this.getProps('inverseByBgColor') && bgColorVal) {
			// 1. convert to grey scale
			// 2. choose text color by grey scale of bg
			const bgColor = new Color(bgColorVal)
			const gray = bgColor.r * 0.299 + bgColor.g * 0.587 + bgColor.b * 0.114
			this.greyToTextColor.forEach((interval) => {
				if (gray >= interval.from && gray <= interval.to) {
					result.text = interval.color
					result.shadow = interval.shadow
				}
			})
			return result
		} else {
			result.text = this.getProps('text_color') ?? '#000000'
			result.shadow = this.getProps('text_shadow_color') ?? '#000000'
			return result
		}
	}

	private _isBoxInside(box, width, height) {
		const size = box.getSize(this._size)
		const leftx = box.min.x * this.ratio
		const lefty = box.min.y * this.ratio
		const rightx = leftx + size.x * this.ratio
		const righty = lefty + size.y * this.ratio
		if (leftx > width || lefty > height || rightx < 0 || righty < 0) {
			return false
		}
		return true
	}

	private _calcTextWidth(text, fontSize) {
		let width = 0
		text.split('').forEach((char) => {
			if (ChineseCharPattern.test(char)) {
				width += fontSize
			} else {
				width += fontSize / 2
			}
		})
		return width
	}

	private _showMarker(marker, timeline, duration = 200) {
		marker.alpha = 0.0
		marker.labelVisible = true
		const track = timeline.addTrack({
			id: 'MarkerShow',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				marker.alpha = 1.0
				marker.labelVisible = true
				this._animTracks.splice(this._animTracks.indexOf(track), 1)
			},
			onUpdate: (t, p) => {
				marker.alpha = p
			},
		})
		this._animTracks.push(track)
	}

	private _hideMarker(marker, timeline, duration = 200) {
		marker.alpha = 1.0
		marker.labelVisible = true
		const track = timeline.addTrack({
			id: 'MarkerHide',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				marker.alpha = 0.0
				marker.labelVisible = false
				this._animTracks.splice(this._animTracks.indexOf(track), 1)
			},
			onUpdate: (t, p) => {
				marker.alpha = 1.0 - p
			},
		})
		this._animTracks.push(track)
	}
}
