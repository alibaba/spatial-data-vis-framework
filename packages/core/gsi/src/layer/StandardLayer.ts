/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * layer view 的逻辑 需要复用，
 * 但是 typescript 中 mixin 和 decoration 都会造成一定程度的 interface 混乱
 * 因此在这里把constructor里增加的逻辑拆成函数，
 */

import { Mesh } from '@gs.i/frontend-sdk'
import {
	Layer,
	LayerProps,
	PickEventResult,
	AbstractLayerEvents,
	// AbstractPolaris,
	// CoordV2,
	// PickEvent,
} from '@polaris.gl/base'
import { GSIView } from './view/GsiView'
import { HtmlView } from './view/HtmlView'
import { Matrix4, Vector3, Vector2 } from '@gs.i/utils-math'
import { isRenderable } from '@gs.i/schema-scene'
import { MatProcessor } from '@gs.i/processor-matrix'
// import { Projection } from '@polaris.gl/projection'
// import { Raycaster } from '@gs.i/processor-raycast'

import type { PolarisGSI } from '../polaris/index'

// override Node & EventDispatcher interfaces to hide underlying implements.
export interface StandardLayer {
	get parent(): StandardLayer | PolarisGSI | null
	get children(): Set<StandardLayer>
	get root(): StandardLayer | PolarisGSI | null
	add(child: StandardLayer): void
	remove(child: StandardLayer): void
	traverse(handler: (node: StandardLayer) => void): void
	set onAdd(f: (parent: any) => void) // workaround ts bug
	set onRemove(f: (parent: any) => void)
}

/**
 * 配置项 interface
 */
export interface StandardLayerProps extends LayerProps {
	parent?: StandardLayer | PolarisGSI
	/**
	 * @deprecated @unreliable may break internal 3d scene
	 */
	depthTest?: boolean
	/**
	 * @deprecated @unreliable may break internal 3d scene
	 */
	renderOrder?: number

	/**
	 * whether this layer's gsi view should be raycast-ed
	 */
	pickable?: boolean

	/**
	 * @deprecated use {@link .addEventListener("pick")} instead
	 */
	onPicked?: (event: PickEventResult | undefined) => void
	/**
	 * @deprecated use {@link .addEventListener("hover")} instead
	 */
	onHovered?: (event: PickEventResult | undefined) => void

	// data
	data?: any
}

export const defaultStandardLayerProps: StandardLayerProps = {
	depthTest: true,
	renderOrder: 0,
	pickable: false,
}

/**
 * Temp vars
 */
const _mat4 = new Matrix4()
const _vec3 = new Vector3()
const _vec2 = new Vector2()

/**
 * @todo should use the same one from renderer to share cache
 */
const defaultMatProcessor = new MatProcessor()

/**
 * Standard Layer
 * 标准 Layer，包含 GSIView 作为 3D 容器，HTMLView 作为 2D 容器
 */
export class StandardLayer<
	TProps extends StandardLayerProps = StandardLayerProps,
	TEventTypes extends AbstractLayerEvents = AbstractLayerEvents
> extends Layer<TProps, TEventTypes> {
	readonly isStandardLayer = true

	view: { gsi: GSIView; html: HtmlView }

	constructor(props: TProps) {
		super(props)

		// @note
		// 不应该允许选择 standard layer 的 view
		// 唯一出现过的需求是：marker layer不需要html，可选view用于性能优化。
		// 普通layer 如果可以随意删掉view，会导致子layer挂载时出错
		// 如果需要性能优化，选择其他方案

		this.view = {
			/**
			 * 挂载 DOM 元素
			 */
			html: new HtmlView().init(this),
			/**
			 * 挂载 GSI 元素
			 */
			gsi: new GSIView().init(this),
		}

		// @note
		// Use AfterInit to make sure this happens after scene
		// construction which happens when InitEvent.
		this.addEventListener('afterInit', ({ projection, timeline, polaris }) => {
			/**
			 * 每个Layer应当都有depthTest和renderOrder的prop listener
			 * @NOTE 这里设定了两个默认的方法，若Layer有自己的设定逻辑可以重写这两个方法
			 */
			this.watchProps(
				['depthTest'],
				() => {
					const depthTest = this.getProp('depthTest')
					if (depthTest !== undefined) {
						this.onDepthTestChange(depthTest)
					}
				},
				true
			)
			this.watchProps(
				['renderOrder'],
				() => {
					const renderOrder = this.getProp('renderOrder')
					if (renderOrder !== undefined) {
						this.onRenderOrderChange(renderOrder)
					}
				},
				true
			)

			// Set onPicked callback to props
			const onPicked = this.getProp('onPicked')
			if (onPicked !== undefined) {
				this.onPicked = onPicked
			}

			const onHovered = this.getProp('onHovered')
			if (onHovered !== undefined) {
				this.onHovered = onHovered
			}
		})
	}

	/**
	 * root group of GSI objects
	 * @note all renderable contents shall be put here
	 */
	get group(): Mesh {
		return this.view.gsi.group
	}

	/**
	 * root of html elements
	 * @note all renderable contents shall be put here
	 */
	get element() {
		return this.view.html.element
	}

	// /**
	//  * get world matrix of this layer's 3d wrapper
	//  *
	//  * @note return undefined if not inited
	//  */
	// getWorldMatrix() {
	// 	if (!this.inited) {
	// 		console.warn('can not call getWorldMatrix until layer is inited')
	// 		return
	// 	}

	// 	return defaultMatProcessor.getCachedWorldMatrix(this.view.gsi.alignmentWrapper)
	// }

	// /**
	//  * 获取世界坐标在当前layer的经纬度
	//  *
	//  * @param {number} x
	//  * @param {number} y
	//  * @param {number} z
	//  * @return {*}  {(number[] | undefined)}
	//  * @memberof StandardLayer
	//  * @deprecated @todo 确认命名正确，可能是本地坐标而非世界坐标
	//  *
	//  * @note return undefined if not inited
	//  */
	// toLngLatAlt(x: number, y: number, z: number): number[] | undefined {
	// 	if (!this.inited) {
	// 		console.warn('can not call toLngLatAlt until layer is inited')
	// 		return
	// 	}

	// 	const projection = this.resolveProjection() as Projection // this won't be null after inited

	// 	const worldMatrix = this.getWorldMatrix() as number[]
	// 	const inverseMat = _mat4.fromArray(worldMatrix).invert()
	// 	const v = _vec3.set(x, y, z)
	// 	// Transform to pure world xyz
	// 	v.applyMatrix4(inverseMat)
	// 	return projection.unproject(v.x, v.y, v.z)
	// }

	// /**
	//  * 获取经纬度对应的世界坐标
	//  *
	//  * @param {number} lng
	//  * @param {number} lat
	//  * @param {number} [alt=0]
	//  * @return {*}  {(Vector3 | undefined)}
	//  * If the layer has no projection, or a worldMatrix yet, an {undefined} result will be returned.
	//  * @memberof StandardLayer
	//  * @todo 确认命名正确，可能是本地坐标而非世界坐标
	//  *
	//  * @note return undefined if not inited
	//  */
	// toWorldPosition(lng: number, lat: number, alt = 0): Vector3 | undefined {
	// 	if (!this.inited) {
	// 		console.warn('can not call toWorldPosition until layer is inited')
	// 		return
	// 	}

	// 	const worldMatrix = this.getWorldMatrix() as number[]
	// 	const projection = this.resolveProjection() as Projection
	// 	const matrix4 = _mat4.fromArray(worldMatrix)
	// 	const pos = _vec3.fromArray(projection.project(lng, lat, alt))
	// 	pos.applyMatrix4(matrix4)
	// 	return pos
	// }

	// /**
	//  * 获取经纬度对应的屏幕坐标
	//  *
	//  * @param {number} lng
	//  * @param {number} lat
	//  * @param {number} [alt=0]
	//  * @return {*}  {(Vector2 | undefined)}
	//  * If the layer has no projection,
	//  * or a worldMatrix, or not added to any Polaris yet,
	//  * an {undefined} result will be returned.
	//  * @memberof StandardLayer
	//  *
	//  * @note return undefined if not inited
	//  */
	// toScreenXY(lng: number, lat: number, alt = 0): Vector2 | undefined {
	// 	if (!this.inited) {
	// 		console.warn('can not call toScreenXY until layer is inited')
	// 		return
	// 	}

	// 	const polaris = this.root as AbstractPolaris

	// 	const worldPos = this.toWorldPosition(lng, lat, alt)
	// 	if (!worldPos) return

	// 	const screenXY = polaris.getScreenXY(worldPos.x, worldPos.y, worldPos.z)
	// 	if (!screenXY) return

	// 	const xy = _vec2.fromArray(screenXY)

	// 	// Align to html dom x/y
	// 	xy.y = polaris.height - xy.y

	// 	return xy
	// }

	// /**
	//  * Highlight API
	//  *
	//  * @memberof StandardLayer
	//  */
	// highlightByIndices: (dataIndexArr: number[], style: { [name: string]: any }) => void

	/**
	 * depthTest的设定函数，可被子类重写
	 * @node 默认只遍历group内的第一层
	 * @todo It doesn't work as excepted in 3d space
	 * @deprecated
	 */
	protected onDepthTestChange(depthTest: boolean) {
		this.group.children.forEach((mesh) => {
			if (isRenderable(mesh)) {
				//
				mesh.material.extensions || (mesh.material.extensions = {})
				mesh.material.extensions.EXT_matr_advanced ||
					(mesh.material.extensions.EXT_matr_advanced = {})

				mesh.material.extensions.EXT_matr_advanced.depthTest =
					depthTest ?? mesh.material.extensions.EXT_matr_advanced.depthTest
			}
		})
	}

	/**
	 * renderOrder的设定函数，可被子类重写
	 * @node 默认只遍历group内的第一层
	 * @todo It doesn't work as excepted in 3d space
	 * @deprecated
	 */
	protected onRenderOrderChange(renderOrder: number) {
		this.group.children.forEach((mesh) => {
			if (isRenderable(mesh)) {
				//
				mesh.extensions || (mesh.extensions = {})
				mesh.extensions.EXT_mesh_order || (mesh.extensions.EXT_mesh_order = {})

				mesh.extensions.EXT_mesh_order.renderOrder =
					renderOrder ?? mesh.extensions.EXT_mesh_order.renderOrder
			}
		})
	}

	override setProps(props: Partial<TProps | StandardLayerProps>) {
		/**
		 * @note keep in mind that:
		 * Partial<TProps> is not `assignable` until generic type TProps get settled.
		 * So if you use Partial<GenericType> as a writeable value or function param.
		 * Use `.t3` like the following code:
		 *
		 * ```
		 * class A<T extends { s: boolean }> {
		 * 		t1: T
		 * 		t2: Partial<T>
		 * 		t3: Partial<T | { s: boolean }>
		 *
		 * 		set() {
		 * 			// write
		 * 			this.t1 = { s: true } // ❌ TS Error
		 * 			this.t2 = { s: true } // ❌ TS Error
		 * 			this.t3 = { s: true } // ✅ TS Pass
		 * 			this.t3 = { l: true } // ❌ TS Error
		 *
		 * 			// read
		 *			this.t1.s // boolean
		 *			this.t2.s // boolean | undefined
		 *			this.t3.s // boolean | undefined
		 * 		}
		 * }
		 *
		 * class B extends A<{ l?: boolean; s: boolean }> {
		 * 		set() {
		 * 			this.t1 = { s: true } // ✅ TS Pass
		 * 			this.t2 = { s: true } // ✅ TS Pass
		 * 			this.t3 = { s: true } // ✅ TS Pass
		 * 			this.t3 = { l: true } // ✅ TS Pass
		 * 		}
		 * }
		 * ```
		 */
		super.setProps(props as any)
	}

	/**
	 * 该方法用来被外部使用者调用
	 *
	 * @param {*} data
	 * @return {*}  {Promise<void>}
	 * @memberof Layer
	 */
	updateData(data: any): void {
		return this.setProps({
			data: data,
		})
	}

	override updateAlignmentMatrix(matrix: number[]) {
		const old = this.view.gsi.alignmentWrapper.transform.matrix as number[]
		if (!isEqualArray(old, matrix)) {
			copyArray(matrix, old)
		}
	}

	override dispose(): void {}

	// TODO refactor picking
	// override raycast(
	// 	polaris: AbstractPolaris,
	// 	canvasCoord: CoordV2,
	// 	ndc: CoordV2
	// ): PickEvent | undefined {
	// 	if (!this.inited) {
	// 		console.warn('raycast: layer not inited')
	// 		return undefined
	// 	}

	// 	if (!this.getProp('pickable')) {
	// 		return undefined
	// 	}
	// }
}

/**
 * @deprecated renamed as {@link StandardLayer}
 */
export const STDLayer = StandardLayer

function isEqualArray(a: number[], b: number[]) {
	if (a === b) return true

	if (a.length !== b.length) return false

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}

	return true
}

function copyArray(source: number[], target: number[]) {
	for (let i = 0; i < source.length; i++) {
		target[i] = source[i]
	}
}
