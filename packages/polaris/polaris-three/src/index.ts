/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Raycaster as ThreeRaycaster } from 'three'

import { Texture, Matrix, Vec3, isRenderable, RenderableNode } from '@gs.i/schema-scene'
import { specifyTexture } from '@gs.i/utils-specify'
import { Raycaster, RaycastInfo } from '@gs.i/processor-raycast'

import { PolarisGSI, PolarisGSIProps } from '@polaris.gl/gsi'

import { ThreeRenderer } from './renderer/ThreeRenderer'
import { Reflector } from './renderer/Reflector'

export type PolarisThreeProps = PolarisGSIProps & {
	/**
	 * 是否生成地面反射器
	 * @note 反射器提供一个铺在 XY 平面上、铺满视图的反射贴图，以及使用它的矩阵
	 * @default false
	 */
	enableReflection?: boolean
	/**
	 * 反射贴图分辨率比例
	 * @note 反射贴图相对于画布的分辨率缩放, 根据性能选择合适的分辨率
	 * @default 0.5
	 */
	reflectionRatio?: number
}

export class PolarisThree extends PolarisGSI {
	readonly renderer: ThreeRenderer
	private raycaster: Raycaster

	private readonly enableReflection: boolean
	private readonly reflectionRatio: number
	private readonly reflector?: Reflector

	declare readonly reflectionTexture?: Texture
	declare readonly reflectionTextureBlur?: Texture
	declare readonly reflectionMatrix?: Matrix

	constructor(props: PolarisThreeProps) {
		super(props)

		this.enableReflection = !!props.enableReflection
		this.reflectionRatio = props.reflectionRatio || 0.5

		this.renderer = new ThreeRenderer({
			...this.getRendererConfig(),
			root: this.view.gsi.alignmentWrapper,
		})

		this.cameraProxy.config.onUpdate = (cam) => this.renderer.updateCamera(cam)
		this.cameraProxy['onUpdate'] = (cam) => this.renderer.updateCamera(cam)
		// 这里立刻update
		this.renderer.updateCamera(this.cameraProxy)
		this.renderer.resize(this.width, this.height, this.ratio)

		this.view.html.element.appendChild(this.renderer.canvas)

		this.raycaster = new Raycaster({
			boundingProcessor: this.boundingProcessor,
			matrixProcessor: this.matrixProcessor,
		})

		this.addEventListener('dispose', () => this.raycaster.dispose())

		if (this.enableReflection) {
			const reflector = new Reflector({
				textureWidth: (this.getProp('width') as number) * this.reflectionRatio,
				textureHeight: (this.getProp('height') as number) * this.reflectionRatio,
				debugBlur: false,
			})
			this.reflector = reflector

			this.addEventListener('dispose', () => reflector.dispose())

			this.renderer['scene'].add(reflector)

			this.reflectionTexture = specifyTexture({
				image: {
					uri: 'https://img.alaassicdn.com/imgextra/i1/O1CN01V6Tl3V1dzC8hdgJdi_!!6000000003806-2-tps-4096-4096.png',
				},
				extensions: { EXT_ref_threejs: reflector.texture },
			})
			this.reflectionTexture['name'] = 'reflectionTexture'

			this.reflectionTextureBlur = specifyTexture({
				image: {
					uri: 'https://img.alicdn.com/imgextra/i1/O1CN01V6Tl3V1dzC8hdgJdi_!!6000000003806-2-tps-4096-4096.png',
				},
				extensions: { EXT_ref_threejs: reflector.textureBlur },
			})
			this.reflectionTextureBlur['name'] = 'reflectionTextureBlur'

			this.reflectionMatrix = reflector.reflectionMatrix.elements

			this.watchProps(['width', 'height'], (e) => {
				reflector.resize(
					(this.getProp('width') as number) * this.reflectionRatio,
					(this.getProp('height') as number) * this.reflectionRatio
				)
			})
		}

		// Renderer props update listener
		const rendererProps = [
			'antialias',
			'background',
			'fov',
			'viewOffset',
			'renderToFBO',
			'lights',
			'cameraNear',
			'cameraFar',
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

		_threeRaycaster.setFromCamera(ndcCoords as any, cam)
		this.raycaster.set(
			_threeRaycaster.ray.origin as Vec3, // safe to assert here
			_threeRaycaster.ray.direction as Vec3 // safe to assert here
		)

		// @note near does not work for perspective camera
		// @link {https://github.com/mrdoob/three.js/blob/master/src/core/Raycaster.js}
		this.raycaster.near = 0
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

	private getRendererConfig() {
		const config = {
			enableReflection: this.enableReflection,
			reflectionRatio: this.reflectionRatio,
			matrixProcessor: this.matrixProcessor,
			boundingProcessor: this.boundingProcessor,
			graphProcessor: this.graphProcessor,
			cullingProcessor: this.cullingProcessor,

			width: this.getProp('width'),
			height: this.getProp('height'),
			ratio: this.getProp('ratio'),
			antialias: this.getProp('antialias'),
			background: this.getProp('background'),
			fov: this.getProp('fov'),
			viewOffset: this.getProp('viewOffset'),
			renderToFBO: this.getProp('renderToFBO'),
			lights: this.getProp('lights'),
			cameraNear: this.getProp('cameraNear'),
			cameraFar: this.getProp('cameraFar'),
			postprocessing: this.getProp('postprocessing') || (false as const),
		}

		Object.keys(config).forEach((key) => {
			if (config[key] === undefined) {
				console.error(
					`PolarisThree:getRendererConfig: ${key} is undefined. May cause renderer error.`
				)
			}
		})

		return config as NonNullableObject<typeof config>
	}
}

/**
 * used for calculate ray from camera
 */
const _threeRaycaster = new ThreeRaycaster()

type NonNullableObject<T> = { [K in keyof T]: NonNullable<T[K]> }
