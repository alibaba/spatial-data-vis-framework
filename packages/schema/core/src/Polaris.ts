/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * Polaris 入口类 基类
 */

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Layer } from './Layer'
import { Projection, MercatorProjection } from '@polaris.gl/projection'
import { Timeline } from 'ani-timeline'
import {
	PointerControl,
	AnimatedCameraProxy,
	TouchControl,
	Cameraman,
	GeographicStates,
	CameraProxy,
} from 'camera-proxy'
import { PolarisProps, defaultProps } from './props'

export { PolarisProps, colorToString } from './props'

/**
 * 根节点
 */
export type RootLayer = Omit<Layer, 'parent' | 'level' | 'init' | 'afterInit' | 'updateData'>

/**
 * Polaris 根节点 基类
 */
export abstract class Polaris extends Layer implements RootLayer {
	readonly isPolaris: boolean

	// canvas: HTMLCanvasElement

	cameraProxy: AnimatedCameraProxy
	cameraControl?: PointerControl | TouchControl
	cameraman: Cameraman

	timeline: Timeline
	projection: Projection

	width: number
	height: number
	canvasWidth: number
	canvasHeight: number
	ratio: number
	scale: number

	protected props: PolarisProps

	protected _disposed: boolean

	constructor(props: PolarisProps) {
		const _props = {
			...defaultProps,
			...props,
		}

		/**
		 * init timeline
		 */
		const timeline =
			_props.timeline ||
			new Timeline({
				duration: Infinity,
				pauseWhenInvisible: false, // 检测标签页是否隐藏，已知在一些环境中不可用，建议关闭
				openStats: false,
				autoRecevery: true, // 自动回收过期的track
				maxStep: 100, // 最大帧长
				maxFPS: 30, // 最大帧率
				ignoreErrors: true, // 出错后是否停止
			})

		/**
		 * 等到全部初始化完成后再开始计时运行
		 * @TODO 应该允许更精确的控制
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

		/**
		 * Polaris self is also an Layer, do Layer initialization
		 */
		super({ ..._props, timeline, projection })
		this.isPolaris = true
		this._disposed = false
		this.name = 'Polaris'
		this.timeline = timeline
		this.projection = projection

		// qianxun: 封装props的values到propsManager接口
		this.props = {} as any
		for (const key in _props) {
			Object.defineProperty(this.props, key, {
				enumerable: true,
				configurable: false,
				get: () => this.getProps(key),
				set: (val) => this.updateProps({ [key]: val }),
			})
		}

		/**
		 * init html / canvas
		 */

		// 逻辑像素
		this.width = _props.width || /* props.container.offsetWidth || */ 1024
		this.height = _props.height || /* props.container.offsetHeight || */ 760
		this.ratio = _props.ratio || 1.0
		this.scale = 1.0

		// 物理像素
		const canvasWidth = this.width * this.ratio
		const canvasHeight = this.height * this.ratio

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
			// TODO 可控制
			limit: {
				pitch: _props.pitchLimit,
				zoom: _props.zoomLimit,
			},
			canvasWidth,
			canvasHeight,
			onUpdate: () => {},
		})

		// cameraProxy config props listener
		this.listenProps(['zoomLimit', 'pitchLimit'], () => {
			cameraProxy['limit'].zoom = this.getProps('zoomLimit')
			cameraProxy['limit'].pitch = this.getProps('pitchLimit')
		})

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
		this.canvasWidth = canvasWidth
		this.canvasHeight = canvasHeight

		this.onBeforeRender = () => {
			const newStatesCode = this.cameraProxy.statesCode
			this.traverse((obj) => {
				if (obj.statesCode !== newStatesCode) {
					obj.statesCode = newStatesCode
					obj._onViewChange.forEach((f) => f(this.cameraProxy, this))
				}
			})
		}

		// 基本绘制循环
		this.timeline.addTrack({
			id: '绘制循环',
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
	}

	// Implement Layer: 将polaris实例传递给children
	getPolaris(): Promise<Polaris> {
		return new Promise((resolve) => {
			resolve(this)
		})
	}

	pause() {
		this.timeline.pause()
	}

	resume() {
		this.timeline.resume()
	}

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

	resize(width, height, ratio = 1.0, externalScale = 1.0) {
		// TODO 重建PointerControl

		this.width = width
		this.height = height
		this.ratio = ratio || this.ratio

		// 逻辑像素
		this.canvasWidth = this.width * this.ratio
		this.canvasHeight = this.height * this.ratio

		this.cameraProxy.canvasWidth = this.canvasWidth
		this.cameraProxy.canvasHeight = this.canvasHeight
		this.cameraProxy.config.canvasWidth = this.canvasWidth
		this.cameraProxy.config.canvasHeight = this.canvasHeight
		this.cameraProxy.ratio = this.ratio // -> this.cam.update()

		this.props.width = width
		this.props.height = height

		this.setExternalScale(externalScale)
	}

	setRatio(ratio = 1.0) {
		this.resize(this.width, this.height, ratio)
	}

	/**
	 * 设置外部画布缩放比例
	 * @NOTE 调用此接口时，需要确认是否画布或容器已从外部设置了额外scale，如: style.transform
	 * @param {number} [scale=1.0] 对应外部设置的画布缩放值
	 * @memberof Polaris
	 */
	setExternalScale(scale = 1.0) {
		this.scale = scale || this.scale
		if (this.cameraControl) {
			this.cameraControl.scale = this.scale
		}
	}

	tick() {
		if (this._disposed) {
			throw new Error('Polaris - This instance is disposed. Create a new one if needed.')
		}

		// onBeforeRender
		this.traverse((obj) => {
			if (obj.visible) {
				obj._onBeforeRender.forEach((cbk) => cbk(this, this.cameraProxy))
			}
		})

		this.render()

		// onAfterRender
		this.traverse((obj) => {
			if (obj.visible) {
				obj._onAfterRender.forEach((cbk) => cbk(this, this.cameraProxy))
			}
		})
	}

	/**
	 * 销毁，尽可能多的释放资源
	 */
	dispose() {
		super.dispose()
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
}
