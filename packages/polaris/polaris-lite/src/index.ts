/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { isRenderable, RenderableNode, Vec3 } from '@gs.i/schema-scene'
import { PolarisProps } from '@polaris.gl/base'
import { PolarisGSI } from '@polaris.gl/gsi'
import { LiteRenderer } from './renderer/LiteRenderer'
import { Raycaster as ThreeLiteRaycaster } from 'three-lite'
import { Raycaster, RaycastInfo } from '@gs.i/processor-raycast'

export interface PolarisLiteProps extends PolarisProps {}

export interface PolarisLite extends PolarisGSI {}
export class PolarisLite extends PolarisGSI {
	readonly renderer: LiteRenderer

	// raycast objects
	private _threeLiteRaycaster: ThreeLiteRaycaster
	private _raycaster: Raycaster

	constructor(props: PolarisLiteProps) {
		super(props)
		this.renderer = new LiteRenderer(this.props)

		this.cameraProxy.config.onUpdate = (cam) => this.renderer.updateCamera(cam)
		this.cameraProxy['onUpdate'] = (cam) => this.renderer.updateCamera(cam)
		// 这里立刻update
		this.renderer.updateCamera(this.cameraProxy)
		this.renderer.resize(this.width, this.height, this.ratio)
		this.view.html.element.appendChild(this.renderer.canvas)

		// init picking
		this._threeLiteRaycaster = new ThreeLiteRaycaster()
		this._raycaster = new Raycaster({
			boundingProcessor: this.props.boundingProcessor,
			matrixProcessor: this.props.matrixProcessor,
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

		this._threeLiteRaycaster.setFromCamera(ndcCoords, cam)
		this._raycaster.set(
			this._threeLiteRaycaster.ray.origin as Vec3, // safe to assert here
			this._threeLiteRaycaster.ray.direction as Vec3 // safe to assert here
		)
		this._raycaster.near = cam.near
		this._raycaster.far = Infinity

		if (object.geometry.mode !== 'TRIANGLES') {
			console.warn(`PolarisLite - Unsupported geometry mode: ${object.geometry.mode}. `)
			return {
				hit: false,
				intersections: [],
			}
		}

		const info = this._raycaster.raycast(object, options.allInters)

		if (!info.hit) {
			return {
				hit: false,
				intersections: [],
			}
		}

		return info
	}
}
