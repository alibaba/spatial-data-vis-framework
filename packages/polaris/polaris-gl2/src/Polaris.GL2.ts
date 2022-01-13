/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { HtmlView } from '@polaris.gl/view-html'
import { ThreeView } from '@polaris.gl/view-three'
import * as capacity from '@polaris.gl/utils/dist/capacity'
import { GL2Renderer } from '@polaris.gl/renderer-gl2'
import { PointerControl, AnimatedCameraProxy, TouchControl, Cameraman } from 'camera-proxy'
import { THREE } from 'gl2'
import { Polaris, PolarisProps } from '@polaris.gl/schema'

export type PolarisGL2Props = PolarisProps

/**
 * 轻量级 Polaris 渲染器
 * - three.js 或 three.js 子集
 * - 体积小，逻辑简化，基础图形效果
 * - IE11 和 移动端 友好
 * - 仅支持挂载 level <= L2 的 Layer
 */
export class PolarisGL2 extends Polaris {
	/**
	 * top view layer
	 */
	view = {
		html: new HtmlView().init(this),
		three: new ThreeView<THREE.Group>(this, THREE.Group),
	}

	renderer: GL2Renderer
	camera: THREE.PerspectiveCamera
	cameraProxy: AnimatedCameraProxy
	cameraControl?: PointerControl | TouchControl
	cameraman: Cameraman

	constructor(props: PolarisGL2Props) {
		super(props)

		/**
		 * init html / canvas
		 */

		const container = this.props.container as HTMLDivElement

		this.view.html.element // = document.createElement('DIV')
		this.view.html.element.style.position = 'relative'
		this.view.html.element.style.width = this.width + 'px'
		this.view.html.element.style.height = this.height + 'px'
		this.view.html.element.style.overflow = 'hidden'
		this.view.html.element.className = 'polaris-wrapper'
		container.appendChild(this.view.html.element)

		const canvas = document.createElement('canvas')
		canvas.style.position = 'absolute'
		canvas.style.left = '0px'
		canvas.style.top = '0px'
		canvas.style.width = this.width + 'px'
		canvas.style.height = this.height + 'px'
		canvas.width = this.canvasWidth
		canvas.height = this.canvasHeight
		this.view.html.element.appendChild(canvas)

		/**
		 * init THREE Camera
		 */
		const { cameraNear, cameraFar } = this.props
		const camera = new THREE.PerspectiveCamera(
			this.props.fov,
			this.width / this.height,
			cameraNear,
			cameraFar
		)
		camera.matrixAutoUpdate = false
		this.camera = camera

		const syncCam = (cam) => {
			camera.position.fromArray(cam.position)
			camera.rotation.fromArray(cam.rotationEuler)
			camera.updateMatrix()
			camera.updateMatrixWorld(true)
			// @TODO update cameraNear/cameraFar
		}
		this.cameraProxy.config.onUpdate = syncCam
		this.cameraProxy['onUpdate'] = syncCam

		if (this.props.cameraControl) {
			if (capacity.isTouchDevice) {
				this.cameraControl = new TouchControl({
					camera: this.cameraProxy,
					element: this.view.html.element as HTMLElement,
				})
			} else {
				this.cameraControl = new PointerControl({
					camera: this.cameraProxy,
					element: this.view.html.element as HTMLElement,
				})
			}
		}

		this.renderer = new GL2Renderer({
			...this.props,
			canvas,
		})

		this.renderer.scene.add(this.view.three.groupWrapper)
	}

	render() {
		this.renderer.render(this.camera)
	}

	capture() {
		// https://stackoverflow.com/questions/32556939/saving-canvas-to-image-via-canvas-todataurl-results-in-black-rectangle/32641456#32641456
		this.tick()
		return this.renderer.capture()
	}

	resize(width, height, ratio?) {
		this.width = width
		this.height = height

		// 物理像素
		this.canvasWidth = width * this.ratio
		this.canvasHeight = height * this.ratio
		this.ratio = ratio || this.ratio

		this.view.html.element.style.width = width + 'px'
		this.view.html.element.style.height = height + 'px'

		//
		this.renderer.canvas.style.width = width + 'px'
		this.renderer.canvas.style.height = height + 'px'
		this.renderer.canvas.width = this.canvasWidth
		this.renderer.canvas.height = this.canvasHeight
		this.renderer.renderer.setSize(this.canvasWidth, this.canvasHeight) // NOTE: Must resize THREE.Renderer

		this.camera.aspect = width / height
		this.camera.updateProjectionMatrix()

		//
		super.resize(width, height, ratio)
	}

	dispose() {
		this.renderer && this.renderer.dispose()
		this.traverse((base) => {
			base !== this && base.dispose && base.dispose()
		})
		super.dispose()
	}

	getScreenXY(x: number, y: number, z: number): number[] {
		const deviceCoords = this.renderer.getNDC({ x, y, z })
		// Map to canvas coords
		return [(deviceCoords[0] + 1) * 0.5 * this.width, (deviceCoords[1] + 1) * 0.5 * this.height]
	}
}
