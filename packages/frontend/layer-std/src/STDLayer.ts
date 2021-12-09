/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * layer view 的逻辑 需要复用，
 * 但是 typescript 中 mixin 和 decoration 都会造成一定程度的 interface 混乱
 * 因此在这里把constructor里增加的逻辑拆成函数，
 */
import { Layer, LayerProps, PickEventResult, Polaris, View } from '@polaris.gl/schema'
import { GSIView } from '@polaris.gl/view-gsi'
import { Mesh } from '@gs.i/frontend-sdk'
import { HtmlView } from '@polaris.gl/view-html'
import { isSimiliarProjections } from '@polaris.gl/projection'
import { Matrix4, Euler, Vector3, Vector2 } from '@gs.i/utils-math'

/**
 * 配置项 interface
 */
export interface STDLayerProps extends LayerProps {
	depthTest?: boolean
	renderOrder?: number
	pickable?: boolean
	onPicked?: (event: PickEventResult | undefined) => void
	onHovered?: (event: PickEventResult | undefined) => void
}

export const STDLayerProps: STDLayerProps = {
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
export class STDLayer extends Layer {
	constructor(props: STDLayerProps) {
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

		this.afterInit = (projection, timeline, polaris) => {
			/**
			 * 每个Layer应当都有depthTest和renderOrder的prop listener
			 * @NOTE 这里设定了两个默认的方法，若Layer有自己的设定逻辑可以重写这两个方法
			 */
			this.listenProps(['depthTest'], () => {
				const depthTest = this.getProps('depthTest')
				if (depthTest !== undefined) {
					this.onDepthTestChange(depthTest)
				}
			})
			this.listenProps(['renderOrder'], () => {
				const renderOrder = this.getProps('renderOrder')
				if (renderOrder !== undefined) {
					this.onRenderOrderChange(renderOrder)
				}
			})

			// Set onPicked callback to props
			if (this.getProps('onPicked') !== undefined) {
				this.onPicked = this.getProps('onPicked')
			}

			if (this.getProps('onHovered') !== undefined) {
				this.onHovered = this.getProps('onHovered')
			}

			this.parent.getProjection().then((parentProjection) => {
				this._initProjectionAlignment(projection, parentProjection, polaris)
			})
		}
	}

	/**
	 * 视图 interface
	 */
	view: { gsi: GSIView; html: HtmlView; [name: string]: View }

	/**
	 * syntactic suger
	 * 获取 view.gsi.group
	 */
	get group() {
		return this.view.gsi.group
	}

	/**
	 * syntactic suger
	 * 获取 view.html.element
	 */
	get element() {
		return this.view.html.element
	}

	/**
	 * @TODO use generic type to
	 * correct all the method/callback interfaces
	 * inherited from Base
	 */
	add: (child: STDLayer) => void
	remove: (child: STDLayer) => void
	traverse: (f: (obj: STDLayer) => void) => void
	traverseVisible: (f: (obj: STDLayer) => void) => void

	/**
	 * 获取世界坐标在当前layer的经纬度
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @return {*}  {(number[] | undefined)}
	 * @memberof STDLayer
	 */
	toLngLatAlt(x: number, y: number, z: number): number[] | undefined {
		const transform = this.view.gsi.groupWrapper.transform
		const worldMatrix = transform.worldMatrix ?? transform.matrix
		const projection = this.localProjection ?? this.resolvedProjection
		if (!projection) return
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
	 * @memberof STDLayer
	 */
	toWorldPosition(lng: number, lat: number, alt = 0): Vector3 | undefined {
		const transform = this.view.gsi.groupWrapper.transform
		const worldMatrix = transform.worldMatrix ?? transform.matrix
		const projection = this.localProjection ?? this.resolvedProjection
		if (!projection) {
			// console.warn('Polaris::STDLayer - Layer has no projection info, define a projection or add it to a parent layer first. ')
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
	 * @memberof STDLayer
	 */
	toScreenXY(lng: number, lat: number, alt = 0): Vector2 | undefined {
		if (!this.polaris) {
			// console.warn('Polaris::STDLayer - Layer has no polaris info, add it to a polaris first. ')
			return
		}
		const worldPos = this.toWorldPosition(lng, lat, alt)
		if (!worldPos) return

		const screenXY = this.polaris.getScreenXY(worldPos.x, worldPos.y, worldPos.z)
		if (!screenXY) return

		const xy = _vec2.fromArray(screenXY)

		// Align to html dom x/y
		xy.y = this.polaris.height - xy.y

		return xy
	}

	/**
	 * Highlight API
	 *
	 * @memberof STDLayer
	 */
	highlightByIndices: (dataIndexArr: number[], style: { [name: string]: any }) => void

	/**
	 * depthTest的设定函数，可被子类重写
	 * @NOTE 默认只遍历group内的第一层
	 */
	protected onDepthTestChange(depthTest: boolean) {
		this.group.children.forEach((mesh) => {
			if (mesh.material) {
				mesh.material.depthTest = depthTest ?? mesh.material.depthTest
			}
		})
	}

	/**
	 * renderOrder的设定函数，可被子类重写
	 * @NOTE 默认只遍历group内的第一层
	 */
	protected onRenderOrderChange(renderOrder: number) {
		this.group.children.forEach((mesh) => {
			if (mesh.geometry && mesh.material) {
				mesh.renderOrder = renderOrder ?? mesh.renderOrder
			}
		})
	}

	private _initProjectionAlignment(selfProjection, parentProjection, polaris) {
		const DEG2RAD = Math.PI / 180
		const groupWrapper = this.view.gsi.groupWrapper
		this.onAdd = () => {
			// 处理多中心projection
			// 如果自己和父级的projection之间是可以简单变换对其的
			// 如果不可以，就只能每帧去对齐center的经纬度

			if (isSimiliarProjections(selfProjection, parentProjection)) {
				if (selfProjection.isPlaneProjection) {
					// SETTINGS.debug && console.log('平面 简单投影分中心', parent.name, '->', this.name, parent, '->', this)
					const projOffset = parentProjection.project(...selfProjection.center)
					groupWrapper.transform.position.x = projOffset[0]
					groupWrapper.transform.position.y = projOffset[1]
					groupWrapper.transform.position.z = projOffset[2]
				} else if (selfProjection.isShpereProjection) {
					// SETTINGS.debug && console.log('球面 简单投影分中心', parent.name, '->', this.name, parent, '->', this)
					groupWrapper.transform.position.x = selfProjection._xyz0[0] - parentProjection._xyz0[0]
					groupWrapper.transform.position.y = selfProjection._xyz0[1] - parentProjection._xyz0[1]
					groupWrapper.transform.position.z = selfProjection._xyz0[2] - parentProjection._xyz0[2]
				} else {
					console.error('不支持的投影格式', selfProjection)
				}
			} else {
				// 父级为平面，子级为球面
				if (selfProjection.isShpereProjection) {
					// SETTINGS.debug &&
					// 	console.log( '平面-球面 投影系统分中心', parent.name, '->', this.name, parent, '->', this )

					const groupMat = new Matrix4()
					const euler = new Euler()
					const mat1 = new Matrix4()
					const mat2 = new Matrix4()
					const mat3 = new Matrix4()

					this.onViewChange = (cam, p) => {
						// TODO 每帧重复计算多次
						const lnglat = (p as Polaris).getGeoCenter()

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
						groupWrapper.transform.matrix = groupMat.elements
					}
				} else {
					// SETTINGS.debug &&
					// 	console.log( '平面-平面 投影系统分中心', parent.name, '->', this.name, parent, '->', this )
					this.onViewChange = (cam, p) => {
						// 世界中心经纬度
						// TODO 每帧重复计算多次
						const lnglat = (p as Polaris).projection.unproject(
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
				this._onViewChange.forEach((f) => f(polaris.cameraProxy, polaris))
			}
		}
	}
}
