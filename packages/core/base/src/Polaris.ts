/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * Polaris 入口类 基类
 */

import { AbstractLayer, isAbstractLayer } from './AbstractLayer'
import { Projection, MercatorProjection } from '@polaris.gl/projection'
import { Timeline } from 'ani-timeline'
import {
	PointerControl,
	AnimatedCameraProxy,
	TouchControl,
	Cameraman,
	GeographicStates,
} from 'camera-proxy'
import { PolarisProps, defaultProps, STATIC_PROPS } from './props/index'
import type { AbstractPolarisEvents } from './events'
import { debug } from './utils'

export { colorToString } from './props/index'
export type { PolarisProps } from './props/index'

/**
 * AbstractPolaris
 */
export abstract class AbstractPolaris extends AbstractLayer<PolarisProps, AbstractPolarisEvents> {
	// polaris is always the root
	override get parent(): null {
		return null
	}
	override get root(): this {
		return this
	}

	/**
	 * store view states of layers, used to emit viewChange event on layers
	 */
	#layerViewStates = new WeakMap<AbstractLayer, ViewStates>()

	/**
	 * @todo readonly props should use getter
	 */

	readonly cameraProxy: AnimatedCameraProxy
	readonly cameraControl?: PointerControl | TouchControl
	readonly cameraman: Cameraman

	readonly timeline: Timeline
	readonly projection: Projection

	#width: number
	#height: number
	#ratio: number

	/**
	 * with of content @pixel
	 * @note change this by calling resize
	 * @default 500
	 * @readonly
	 */
	get width() {
		return this.#width
	}
	/**
	 * height of content @pixel
	 * @note change this by calling resize
	 * @default 500
	 * @readonly
	 */
	get height() {
		return this.#height
	}
	/**
	 * actual width of the canvas @pixel
	 * - canvasWidth = width * ratio
	 */
	get canvasWidth() {
		return this.width * this.ratio
	}
	/**
	 * actual height of the canvas @pixel
	 * - canvasHeight = heigh * ratio
	 */
	get canvasHeight() {
		return this.height * this.ratio
	}

	/**
	 * pixel ratio, this affect the actual rendering resolution.
	 * @note change this by calling resize or setRatio
	 * @default 1
	 * @readonly
	 */
	get ratio() {
		return this.#ratio
	}

	/**
	 * scale of this canvas, scale the canvas with css.
	 * @note change this by calling resize or setExternalScale
	 * @default 1
	 * @readonly
	 */
	// get scale() {
	// 	return this.getProp('scale') ?? defaultProps.scale
	// }

	#disposed = false

	constructor(props: PolarisProps) {
		super()

		const _props = {
			...defaultProps,
			...props,
		}

		this.setProps(_props)

		this.#width = _props.width
		this.#height = _props.height
		this.#ratio = _props.ratio

		this.watchProps(['width', 'height', 'ratio'], (e) => {
			this.resize(
				this.getProp('width') ?? this.#width,
				this.getProp('height') ?? this.#height,
				this.getProp('ratio') ?? this.#ratio
			)
		})

		/**
		 * init timeline
		 */
		const timeline =
			_props.timeline ||
			new Timeline({
				duration: Infinity,
				// pauseWhenInvisible: false, // 检测标签页是否隐藏，已知在一些环境中不可用，建议关闭
				openStats: false,
				autoRelease: true, // 自动回收过期的track
				maxStep: 100, // 最大帧长
				maxFPS: 30, // 最大帧率
				// ignoreErrors: true, // 出错后是否停止
			})

		/**
		 * 等到全部初始化完成后再开始计时运行
		 * @TODO 应该允许更精确的控制
		 * @TODO not safe for input timeline
		 */
		setTimeout(() => {
			this.timeline.play()
		})

		/**
		 * init projection
		 */
		const projection =
			_props.projection ||
			new MercatorProjection({
				center: [0, 0],
			})

		this.timeline = timeline
		this.projection = projection

		// this._props = props

		// const [changeableProps, staticKeys] = propsFilter(_props, changeableKeys)
		// this.updateProps(changeableProps)

		/**
		 * init html / canvas
		 */

		// 物理像素
		const canvasWidth = this.canvasWidth
		const canvasHeight = this.canvasWidth

		/**
		 * init CameraProxy
		 * proxy Renderer.camera
		 */
		const { fov, center, zoom, pitch, rotation } = _props
		const cameraProxy = new AnimatedCameraProxy({
			cameraFOV: fov as number,
			timeline,
			/** @LIMIT 开启inert会影响的部分：SphereProject同步，Animations的结束时间，暂时关闭inert */
			inert: false,
			canvasWidth,
			canvasHeight,
			onUpdate: () => {},
		})

		// @todo not a good practice, order dependent
		// cameraProxy config props listener
		this.watchProps(
			['zoomLimit', 'pitchLimit'],
			() => {
				cameraProxy['limit'].zoom = this.getProp('zoomLimit')
				cameraProxy['limit'].pitch = this.getProp('pitchLimit')
			},
			true
		)

		// 更新相机初始状态
		const geo = this.projection.project(...(center as [number, number, number]))
		const states: GeographicStates = {
			center: geo,
			pitch: pitch || 0 - 0,
			rotation: rotation || 0 - 0,
			zoom: zoom || 0 - 0,
		}
		// 使用无缓动的setStates方法，因为此时timeline可能还未start
		cameraProxy.setGeographicStates(states)

		// this.cameraman = new Cameraman({ camera: cameraProxy })

		this.cameraProxy = cameraProxy

		// check view change for all layers every frame
		this.addEventListener('beforeRender', (e) => {
			const newStatesCode = this.cameraProxy.statesCode
			const newWidth = this.width
			const newHeight = this.height
			const newRatio = this.ratio
			// debugger
			this.traverse((obj) => {
				if (!isAbstractLayer(obj)) return

				let viewStates = this.#layerViewStates.get(obj)
				if (!viewStates) {
					viewStates = {} as ViewStates
					this.#layerViewStates.set(obj, viewStates)
				}

				if (
					viewStates.width !== newWidth ||
					viewStates.height !== newHeight ||
					viewStates.ratio !== newRatio ||
					viewStates.statesCode !== newStatesCode
				) {
					viewStates.width = newWidth
					viewStates.height = newHeight
					viewStates.ratio = newRatio
					viewStates.statesCode = newStatesCode
					obj.dispatchEvent({ type: 'viewChange', cameraProxy: this.cameraProxy, polaris: this })
				}
			})
		})

		// 基本绘制循环
		this.timeline.addTrack({
			id: 'polaris_render_loop',
			duration: Infinity,
			loop: false,
			onUpdate: () => {
				if (_props.asyncRendering) {
					setTimeout(() => {
						this.tick()
					})
				} else {
					this.tick()
				}
			},
		})

		// static props(change these props will not be reacted or even cause problems)
		this.watchProps(STATIC_PROPS, (e) => {
			console.error(`Do not modify static props: [${e.changedKeys.join(',')}]`)
		})
	}

	pause() {
		this.timeline.pause()
	}

	resume() {
		this.timeline.resume()
	}

	/**
	 * camera states code. represent view and camera states.
	 */
	getStatesCode() {
		const states = this.cameraProxy.getGeographicStates()
		states.center = this.projection.unproject(states.center[0], states.center[1], states.center[2])

		const CODE_VERSION = 1
		const statesTuple = [
			CODE_VERSION, // 0
			(states.center[0] || 0).toFixed(6), // 1
			(states.center[1] || 0).toFixed(6), // 2
			(states.center[2] || 0).toFixed(6), // 3
			(states.pitch || 0).toFixed(5), // 4
			(states.rotation || 0).toFixed(5), // 5
			(states.zoom || 0).toFixed(5), // 6
		]

		return statesTuple.join('|')
	}

	setStatesCode(code: string, duration = 0, options: { [key: string]: any } = {}) {
		const easeFn =
			options.easing ??
			function (p, pow = 2) {
				if ((p *= 2) < 1) {
					return 0.5 * Math.pow(p, pow)
				}
				return 1 - 0.5 * Math.abs(Math.pow(2 - p, pow))
			}
		const statesTuple = code.split('|') as any[]
		if (statesTuple[0] === '0') {
			const states: GeographicStates = {
				center: [statesTuple[1] - 0, statesTuple[2] - 0, statesTuple[3] - 0],
				pitch: statesTuple[4] - 0,
				rotation: statesTuple[5] - 0,
				zoom: statesTuple[6] - 0,
			}
			return this.cameraProxy.setGeographicStatesEase(
				states,
				duration,
				easeFn,
				options.onStart,
				() => {
					// 由于track的onUpdate不是每次结束时都返回1.0，此处保证动画结束时一定在期望位置
					// @qianxun: 效果突变有些明显，暂时禁用
					// this.cameraProxy.setGeographicStates(states)
					options.onEnd && options.onEnd()
				}
			)
		} else if (statesTuple[0] === '1') {
			const states: GeographicStates = {
				center: [statesTuple[1] - 0, statesTuple[2] - 0, statesTuple[3] - 0],
				pitch: statesTuple[4] - 0,
				rotation: statesTuple[5] - 0,
				zoom: statesTuple[6] - 0,
			}
			states.center = this.projection.project(states.center[0], states.center[1], states.center[2])
			return this.cameraProxy.setGeographicStatesEase(
				states,
				duration,
				easeFn,
				options.onStart,
				() => {
					// 由于track的onUpdate不是每次结束时都返回1.0，此处保证动画结束时一定在期望位置
					// @qianxun: 效果突变有些明显，暂时禁用
					// this.cameraProxy.setGeographicStates(states)
					options.onEnd && options.onEnd()
				}
			)
		} else {
			throw new Error('statesCode 版本不支持')
		}
	}

	getGeoCenter() {
		return this.projection.unproject(
			this.cameraProxy.center[0],
			this.cameraProxy.center[1],
			this.cameraProxy.center[2]
		)
	}

	getGeoRange() {
		const viewCoords = this.cameraProxy.getGeoViewCoords()
		return viewCoords.map((coords) => this.projection.unproject(coords.x, coords.y, coords.z))
	}

	resize(width: number, height: number, ratio = this.#ratio) {
		// break loop
		if (width === this.#width && height === this.#height && ratio === this.#ratio) return

		debug(`Polaris:: .resize(${width}, ${height}, ${ratio})`)

		// TODO 重建PointerControl

		this.#width = width
		this.#height = height
		this.#ratio = ratio

		this.cameraProxy.canvasWidth = this.canvasWidth
		this.cameraProxy.canvasHeight = this.canvasHeight
		this.cameraProxy.config.canvasWidth = this.canvasWidth
		this.cameraProxy.config.canvasHeight = this.canvasHeight
		this.cameraProxy.ratio = this.ratio // -> this.cam.update()

		// sync back
		// @note needs to break loop
		this.setProps({
			width,
			height,
			ratio,
		})

		// this.setExternalScale(externalScale)
	}

	setRatio(ratio = 1.0) {
		this.resize(this.#width, this.#height, ratio)
	}

	// /**
	//  * 设置外部画布缩放比例
	//  * @NOTE 调用此接口时，需要确认是否画布或容器已从外部设置了额外scale，如: style.transform
	//  * @param {number} [scale=1.0] 对应外部设置的画布缩放值
	//  * @memberof Polaris
	//  */
	// setExternalScale(scale = 1.0) {
	// 	this.scale = scale || this.scale
	// 	if (this.cameraControl) {
	// 		this.cameraControl.scale = this.scale
	// 	}
	// }

	tick() {
		if (this.#disposed) {
			throw new Error('Polaris - This instance is disposed. Create a new one if needed.')
		}

		// onBeforeRender
		this.traverseVisible((obj) => {
			obj.dispatchEvent({ type: 'beforeRender', polaris: this })
		})

		this.render()

		// onAfterRender
		this.traverseVisible((obj) => {
			obj.dispatchEvent({ type: 'afterRender', polaris: this })
		})
	}

	/**
	 * destroy this and release resources as much as possible.
	 *
	 * 销毁，尽可能多的释放资源
	 */
	dispose() {
		this.timeline.dispose()
		this.cameraProxy.dispose()
		this.cameraControl && this.cameraControl.dispose()
	}

	/**
	 * The actual render method
	 *
	 * @abstract
	 * @memberof Polaris
	 */
	abstract render(): void

	/**
	 * 截图 toDataURL png
	 *
	 * @abstract
	 * @return {*}  {string}
	 * @memberof Polaris
	 */
	abstract capture(): string

	/**
	 * 通过世界坐标获取屏幕像素坐标
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @return {*}  {number[]}
	 * @memberof PolarisGSI
	 */
	abstract getScreenXY(x: number, y: number, z: number): number[] | undefined

	// #region legacy apis

	readonly isPolaris = true

	// #endregion
}

/**
 * @deprecated renamed as {@link AbstractPolaris} for clarity
 */
export type Polaris = AbstractPolaris
/**
 * @deprecated renamed as {@link AbstractPolaris} for clarity
 */
export const Polaris = AbstractPolaris

export function isPolaris(v: any = {}): v is AbstractPolaris {
	return v.isPolaris && v.isAbstractLayer && v.isAbstractNode && v.isEventDispatcher
}

/**
 * States related to viewChange event
 */
type ViewStates = {
	width: number
	height: number
	ratio: number
	statesCode: string
}
