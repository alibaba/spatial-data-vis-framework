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
	AbstractPolaris,
	Layer,
	LayerProps,
	PickEventResult,
	View,
	LayerEvents,
} from '@polaris.gl/base'
import { GSIView } from '@polaris.gl/view-gsi'
import { HtmlView } from '@polaris.gl/view-html'
import { isSimilarProjections } from '@polaris.gl/projection'
import { Matrix4, Euler, Vector3, Vector2 } from '@gs.i/utils-math'
import { isRenderable } from '@gs.i/schema-scene'
// import { Callback, ListenerOptions } from '@polaris.gl/utils-props-manager'
// import { PropsManager } from '@polaris.gl/utils-props-manager'

/**
 * 配置项 interface
 */
export interface StandardLayerProps extends LayerProps {
	/**
	 * @deprecated @todo may break internal 3d scene
	 */
	depthTest?: boolean
	/**
	 * @deprecated @todo may break internal 3d scene
	 */
	renderOrder?: number
	pickable?: boolean
	onPicked?: (event: PickEventResult | undefined) => void
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
 * Standard Layer
 * 标准 Layer，包含 GSIView 作为 3D 容器，HTMLView 作为 2D 容器
 */
export class StandardLayer<
	TProps extends StandardLayerProps = StandardLayerProps,
	TEventTypes extends LayerEvents = LayerEvents
> extends Layer<TProps, TEventTypes> {
	readonly isStandardLayer = true

	view: { gsi: GSIView; html: HtmlView; [name: string]: View }

	constructor(props: TProps) {
		super(props)

		if (!this.view) {
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
		}

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

	/**
	 * 获取世界坐标在当前layer的经纬度
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @return {*}  {(number[] | undefined)}
	 * @memberof StandardLayer
	 * @deprecated @todo 确认命名正确，可能是本地坐标而非世界坐标
	 */
	toLngLatAlt(x: number, y: number, z: number): number[] | undefined {
		const projection = this.localProjection ?? this.resolvedProjection
		if (!projection) {
			console.warn('can not call toLngLatAlt until layer resolved projection and polaris.')
			return
		}

		const polaris = this.resolvedPolaris
		if (!polaris) {
			console.warn('can not call toLngLatAlt until layer resolved projection and polaris.')
			return
		}

		const worldMatrix = this.view.gsi.groupWrapper.getWorldMatrix()
		const inverseMat = _mat4.fromArray(worldMatrix).invert()
		const v = _vec3.set(x, y, z)
		// Transform to pure world xyz
		v.applyMatrix4(inverseMat)
		return projection.unproject(v.x, v.y, v.z)
	}

	/**
	 * 获取经纬度对应的世界坐标
	 *
	 * @param {number} lng
	 * @param {number} lat
	 * @param {number} [alt=0]
	 * @return {*}  {(Vector3 | undefined)}
	 * If the layer has no projection, or a worldMatrix yet, an {undefined} result will be returned.
	 * @memberof StandardLayer
	 * @todo 确认命名正确，可能是本地坐标而非世界坐标
	 */
	toWorldPosition(lng: number, lat: number, alt = 0): Vector3 | undefined {
		const worldMatrix = this.view.gsi.groupWrapper.getWorldMatrix()
		const projection = this.localProjection ?? this.resolvedProjection
		if (!projection) {
			// console.warn('Polaris::StandardLayer - Layer has no projection info, define a projection or add it to a parent layer first. ')
			return
		}
		const matrix4 = _mat4.fromArray(worldMatrix)
		const pos = _vec3.fromArray(projection.project(lng, lat, alt))
		pos.applyMatrix4(matrix4)
		return pos
	}

	/**
	 * 获取经纬度对应的屏幕坐标
	 *
	 * @param {number} lng
	 * @param {number} lat
	 * @param {number} [alt=0]
	 * @return {*}  {(Vector2 | undefined)}
	 * If the layer has no projection,
	 * or a worldMatrix, or not added to any Polaris yet,
	 * an {undefined} result will be returned.
	 * @memberof StandardLayer
	 */
	toScreenXY(lng: number, lat: number, alt = 0): Vector2 | undefined {
		const polaris = this.resolvedPolaris
		if (!polaris) {
			console.warn(
				'Polaris::StandardLayer - Add Layer to polaris-scene before calling `toScreenXY`.'
			)
			return
		}
		const worldPos = this.toWorldPosition(lng, lat, alt)
		if (!worldPos) return

		const screenXY = polaris.getScreenXY(worldPos.x, worldPos.y, worldPos.z)
		if (!screenXY) return

		const xy = _vec2.fromArray(screenXY)

		// Align to html dom x/y
		xy.y = polaris.height - xy.y

		return xy
	}

	/**
	 * Highlight API
	 *
	 * @memberof StandardLayer
	 */
	highlightByIndices: (dataIndexArr: number[], style: { [name: string]: any }) => void

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

	setProps(props: Partial<TProps | StandardLayerProps>) {
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
}

/**
 * @deprecated renamed as {@link StandardLayer}
 */
export const STDLayer = StandardLayer
