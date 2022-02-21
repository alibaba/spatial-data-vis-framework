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

			const parent = this.parent as this // won't be null @simon
			parent.getProjection().then((parentProjection) => {
				this._initProjectionAlignment(projection, parentProjection, polaris)
			})
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

	/**
	 * TODO 该部分应该出现在Polaris中，tree中的layer不一定都是StandardLayer
	 */
	private _initProjectionAlignment(selfProjection, parentProjection, polaris) {
		const DEG2RAD = Math.PI / 180
		const groupWrapper = this.view.gsi.groupWrapper
		this.onAdd = () => {
			// 处理多中心projection
			// 如果自己和父级的projection之间是可以简单变换对其的
			// 如果不可以，就只能每帧去对齐center的经纬度

			if (isSimilarProjections(selfProjection, parentProjection)) {
				if (selfProjection.isPlaneProjection) {
					// SETTINGS.debug && console.log('平面 简单投影分中心', parent.name, '->', this.name, parent, '->', this)
					const projOffset = parentProjection.project(...selfProjection.center)
					groupWrapper.transform.position.x = projOffset[0]
					groupWrapper.transform.position.y = projOffset[1]
					groupWrapper.transform.position.z = projOffset[2]
				} else if (selfProjection.isSphereProjection) {
					// SETTINGS.debug && console.log('球面 简单投影分中心', parent.name, '->', this.name, parent, '->', this)
					groupWrapper.transform.position.x = selfProjection._xyz0[0] - parentProjection._xyz0[0]
					groupWrapper.transform.position.y = selfProjection._xyz0[1] - parentProjection._xyz0[1]
					groupWrapper.transform.position.z = selfProjection._xyz0[2] - parentProjection._xyz0[2]
				} else {
					console.error('不支持的投影格式', selfProjection)
				}
			} else {
				// 父级为平面，子级为球面
				if (selfProjection.isSphereProjection) {
					// SETTINGS.debug &&
					// 	console.log( '平面-球面 投影系统分中心', parent.name, '->', this.name, parent, '->', this )

					const groupMat = new Matrix4()
					const euler = new Euler()
					const mat1 = new Matrix4()
					const mat2 = new Matrix4()
					const mat3 = new Matrix4()

					this.onViewChange = (cam, p: AbstractPolaris) => {
						// TODO 每帧重复计算多次
						const lnglat = p.getGeoCenter()

						/**
						 * @Qianxun
						 * 步骤：
						 * 1 - 将球面中心移动至000（保证旋转中心）
						 * 2 - 进行lnglat欧拉角旋转
						 * 3 - 将球面中心移回selfProjection中心
						 * 4 - 将球面相对世界的位移调整回来，保证球面在视觉中心000
						 * @NOTE matrix相乘的顺序应该和步骤的顺序相反
						 */
						mat1
							.identity()
							.makeTranslation(
								selfProjection['_xyz0'][0],
								selfProjection['_xyz0'][1],
								selfProjection['_xyz0'][2]
							)

						mat2
							.identity()
							.makeRotationFromEuler(
								euler.set((lnglat[1] - 0) * DEG2RAD, (0 - lnglat[0]) * DEG2RAD, 0, 'XYZ')
							)

						mat3
							.identity()
							.makeTranslation(
								cam.center[0] - selfProjection['_xyz0'][0],
								cam.center[1] - selfProjection['_xyz0'][1],
								cam.center[2] - selfProjection['_xyz0'][2]
							)

						/**
						 * @todo 立即更新matrixWorld
						 */
						groupMat.identity().multiply(mat3).multiply(mat2).multiply(mat1)
						// @todo GSIMesh.transform 只能是 TRS 或 Matrix 形式，不能两者切换
						// groupWrapper.transform.matrix = groupMat.elements
						console.error('TODO NOT IMPLEMENTED (父级为平面,子级为球面)')
					}
				} else {
					// SETTINGS.debug &&
					// 	console.log( '平面-平面 投影系统分中心', parent.name, '->', this.name, parent, '->', this )
					this.onViewChange = (cam, p) => {
						// 世界中心经纬度
						// TODO 每帧重复计算多次
						const lnglat = (p as AbstractPolaris).projection.unproject(
							cam.center[0],
							cam.center[1],
							cam.center[2] ?? 0
						)

						const parentCenter = parentProjection.project(...lnglat)
						const selfCenter = selfProjection.project(...lnglat)

						groupWrapper.transform.position.x = parentCenter[0] - selfCenter[0]
						groupWrapper.transform.position.y = parentCenter[1] - selfCenter[1]
						groupWrapper.transform.position.z = parentCenter[2] - selfCenter[2] ?? 0
					}
				}

				// Trigger onViewChanges
				// this._onViewChange.forEach((f) => f(polaris.cameraProxy, polaris))
				this.dispatchEvent({
					type: 'viewChange',
					cameraProxy: polaris.cameraProxy,
					polaris: polaris,
				})
			}
		}
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
