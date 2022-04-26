/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { isRenderable, RenderableNode, Vec3 } from '@gs.i/schema-scene'
import { PolarisGSI, PolarisGSIProps } from '@polaris.gl/gsi'
import { ThreeRenderer } from './renderer/ThreeRenderer'
import { Raycaster as ThreeRaycaster } from 'three'
import { Raycaster, RaycastInfo } from '@gs.i/processor-raycast'
import { initReflection, Reflector } from './renderer/reflection'

export class PolarisThree extends PolarisGSI {
	readonly renderer: ThreeRenderer

	private raycaster: Raycaster

	constructor(props: PolarisGSIProps) {
		super(props)
		this.renderer = new ThreeRenderer(this.props)

		this.cameraProxy.config.onUpdate = (cam) => this.renderer.updateCamera(cam)
		this.cameraProxy['onUpdate'] = (cam) => this.renderer.updateCamera(cam)
		// 这里立刻update
		this.renderer.updateCamera(this.cameraProxy)
		this.renderer.resize(this.width, this.height, this.ratio)
		this.view.html.element.appendChild(this.renderer.canvas)

		this.raycaster = new Raycaster({
			boundingProcessor: this.props.boundingProcessor,
			matrixProcessor: this.props.matrixProcessor,
		})

		// Renderer props update listener
		const rendererProps = [
			'background',
			'cameraNear',
			'cameraFar',
			'fov',
			'viewOffset',
			'lights',
			'postprocessing',
		] as const
		this.watchProps(rendererProps, (e) => {
			this.cameraProxy.fov = e.props.fov ?? this.cameraProxy.fov
			this.renderer.updateConfig(e.props)
		})
	}

	/**
	 * Implement
	 */
	raycastRenderableNode(
		/**
		 * The GSI RenderableNode to be tested
		 */
		object: RenderableNode,
		/**
		 * Normalized Device Coordinates
		 */
		ndcCoords: { x: number; y: number },
		/**
		 * Raycast test options
		 * @param allInters Whether to get all intersections along the ray
		 */
		options: { allInters?: boolean } = {}
	): RaycastInfo {
		if (!isRenderable(object)) {
			return {
				hit: false,
				intersections: [],
			}
		}

		const cam = this.renderer.camera

		_threeRaycaster.setFromCamera(ndcCoords, cam)
		this.raycaster.set(
			_threeRaycaster.ray.origin as Vec3, // safe to assert here
			_threeRaycaster.ray.direction as Vec3 // safe to assert here
		)
		this.raycaster.near = cam.near
		this.raycaster.far = Infinity

		if (object.geometry.mode !== 'TRIANGLES') {
			console.warn(`PolarisThree - Unsupported geometry mode: ${object.geometry.mode}. `)
			return {
				hit: false,
				intersections: [],
			}
		}

		const info = this.raycaster.raycast(object, options.allInters)

		if (!info.hit) {
			return {
				hit: false,
				intersections: [],
			}
		}

		return info
	}
}

/**
 * used for calculate ray from camera
 */
const _threeRaycaster = new ThreeRaycaster()
