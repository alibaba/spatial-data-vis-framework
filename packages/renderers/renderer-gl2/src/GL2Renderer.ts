/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import GL2, { THREE, Renderer as GL2THREERenderer } from 'gl2'
import { MeshDataType } from '@gs.i/schema'

import { Renderer, colorToString, PolarisProps, PickResult } from '@polaris.gl/base'

import { CameraProxy } from 'camera-proxy'

interface RendererProps extends PolarisProps {
	canvas: HTMLCanvasElement
}

const _vec3 = new THREE.Vector3()
export class GL2Renderer extends Renderer {
	canvas: HTMLCanvasElement
	renderer: GL2THREERenderer
	scene: THREE.Scene
	lights: any
	props: RendererProps
	camera: THREE.PerspectiveCamera

	// pp
	frame: THREE.WebGLRenderTarget

	constructor(props: RendererProps) {
		super()

		this.props = props
		this.canvas = props.canvas

		/**
		 * @stage_0 MPV
		 */

		// init renderer
		this.renderer = new GL2.Renderer({
			width: this.props.width,
			height: this.props.height,
			canvas: this.canvas,
			alpha: true,
			antialias: this.props.antialias === 'msaa',
			stencil: false,
		})

		// init scene
		this.scene = new THREE.Scene()
		this.scene.background = new THREE.Color(props.background as string)

		// init lights
		this.lights = new THREE.Group()
		this.lights.name = 'LightsWrapper'
		this.scene.add(this.lights)
		if (this.props.lights) {
			// gltf to three
			if (this.props.lights.ambientLight) {
				const light = new THREE.AmbientLight(
					colorToString(this.props.lights.ambientLight.color),
					this.props.lights.ambientLight.intensity
				)
				light.name = this.props.lights.ambientLight.name || 'AmbientLight'
				this.lights.add(light)
			}
			if (this.props.lights.directionalLights) {
				this.props.lights.directionalLights.forEach((dlight, index) => {
					const light = new THREE.DirectionalLight(colorToString(dlight.color), dlight.intensity)
					light.name = dlight.name || 'DirectionalLight.' + index
					light.position.copy(dlight.position as THREE.Vector3)
					this.lights.add(light)
				})
			}
			if (this.props.lights.pointLights) {
				this.props.lights.pointLights.forEach((plight, index) => {
					const light = new THREE.PointLight(
						colorToString(plight.color),
						plight.intensity,
						plight.range,
						2 // physical
					)
					light.name = plight.name || 'PointLight.' + index
					light.position.copy(plight.position as THREE.Vector3)
					this.lights.add(light)
				})
			}
		}

		/**
		 * @stage_1 BI 需要
		 */

		/**
		 * init picking
		 * 出于兼容性、实现简洁性，应该使用 CPU picking （raycasting）
		 * 但是出于 GL2 和 WebGPU 的优势考虑，应该使用 GPU picking （color buffer）
		 * - GPU picking
		 * 		WebGL
		 * 			使用一个单独的 RT
		 * 			使用一个PickingMaterial 绘制layer masked物体，同时编ID，映射layer
		 * 		WebGL2
		 * 			使用一个独立的 color buffer，同步绘制
		 */

		/**
		 * @stage_2 只兼容桌面端，考虑是否放到 GL2 renderer 里，IE 是否需要？
		 */

		// init shadow
		// init reflection
		// init pp

		if (this.props.renderToFBO) {
			this.frame = new THREE.WebGLRenderTarget(1, 1, {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat,
				stencilBuffer: false,
				depthBuffer: true,
			})

			this.frame.depthTexture = new (THREE.DepthTexture as any)()

			// GL2
			this.frame['multisample'] = this.props.antialias === 'msaa' ? 4 : 0
		}
	}

	render(camera: THREE.PerspectiveCamera) {
		if (this.props.renderToFBO) {
			// The drawing buffer size takes the device pixel ratio into account.
			const drawingBufferSize = (this.renderer as any).getDrawingBufferSize()
			this.frame.setSize(drawingBufferSize.width, drawingBufferSize.height)
			this.renderer.render(this.scene, camera, this.frame)
		} else {
			// debugger
			this.renderer.render(this.scene, camera)
		}
	}

	capture() {
		// https://stackoverflow.com/questions/32556939/saving-canvas-to-image-via-canvas-todataurl-results-in-black-rectangle/32641456#32641456
		this.renderer.context.flush()
		this.renderer.context.finish()
		return this.canvas.toDataURL('image/png')
	}

	updateCamera(cam: CameraProxy) {}

	dispose() {
		this.renderer.dispose()
	}

	getNDC(worldPosition: { x: number; y: number; z: number }): number[] {
		_vec3.x = worldPosition.x
		_vec3.y = worldPosition.y
		_vec3.z = worldPosition.z
		_vec3.project(this.camera)
		return _vec3.toArray()
	}

	resize(width: any, height: any, ratio?: any): void {
		throw new Error('Method not implemented.')
	}
	updateProps(props: { [key: string]: any }): void {
		throw new Error('Method not implemented.')
	}
	pick(
		mesh: MeshDataType,
		ndcCoords: { x: number; y: number },
		options?: { [key: string]: any }
	): PickResult {
		throw new Error('Method not implemented.')
	}
}
