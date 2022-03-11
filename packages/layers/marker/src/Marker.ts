/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Projection } from '@polaris.gl/projection'
import { CameraProxy } from 'camera-proxy'
import { Vector2, Vector3, Matrix4, Euler } from '@gs.i/utils-math'
import { Mesh } from '@gs.i/frontend-sdk'
import { IR, MeshDataType } from '@gs.i/schema-scene'
import { deepCloneMesh, traverse } from './utils'
import { getOrientationMatrix } from './geometry'
// import { computeBBox, computeBSphere } from '@gs.i/utils-geometry'
import { CoordV2, PickEvent } from '@polaris.gl/base'
import {
	getWorldMatrix,
	toLngLatAlt,
	toWorldPosition,
	toScreenXY,
	PolarisGSI,
	StandardLayer,
	StandardLayerProps,
} from '@polaris.gl/gsi'

const R = 6378137 // 常量 - 地球半径

/**
 * 默认配置项
 */
export interface MarkerProps extends StandardLayerProps {
	lng?: number
	lat?: number
	alt?: number
	offsetX?: number
	offsetY?: number
	html?: HTMLElement | string
	style?: any
	object3d?: Mesh
	autoHide?: boolean
	/**
	 * enables high performance mode will reduce the calculation of marker.worldMatrix
	 * which may cause position/screenXY updating lag (a bit)
	 */
	highPerfMode?: boolean
}

/**
 * 配置项 默认值
 */
export const defaultMarkerProps = {
	name: 'marker',
	lng: 0,
	lat: 0,
	alt: 0,
	// html: undefined,
	offsetX: 0,
	offsetY: 0,
	// object3d: undefined,
	autoHide: false,
	highPerfMode: false,
}

/**
 * 单一的Marker，实现在地图上放置三维和二维Marker，可单独使用，一般推荐使用MarkerLayer组件批量生成
 */
export class Marker extends StandardLayer<MarkerProps & typeof defaultMarkerProps> {
	lnglatalt: [number, number, number]
	html?: HTMLElement
	object3d?: MeshDataType

	// lnglat转换过来的position，但不是渲染时真正的realPosition，因为还有经过投影变换同步
	_position: Vector3
	get position() {
		return this._position
	}

	// realWorldPosition，经过投影同步后的真实世界坐标，从transform.worldMatrix中得到
	_worldPosition: Vector3
	get worldPosition() {
		return this._worldPosition
	}

	// 只有在球面投影时这个direction才有作用，是从球心到marker位置的方向，用来计算是否被旋转到了背面
	_worldDirection: Vector3
	get worldDirection() {
		return this._worldDirection
	}

	// Screen coords of html DOM
	_screenXY: Vector2
	get screenXY() {
		return this._screenXY
	}

	// Visibility vars
	camPosition: Vector3
	camRotationEuler: Euler
	inScreen: boolean
	onEarthFrontSide: boolean
	altAngleThres: number
	angleThres: number
	earthCenter: Vector3
	framesAfterInit: number

	// Animation
	private _meshAlphaModes = new Map<IR.RenderableNode, IR.Material['alphaMode']>()
	private _matrOpMap = new Map<IR.MaterialBase, number>()

	private _disposed: boolean
	get disposed() {
		return this._disposed
	}

	/**
	 * Temp vars
	 */
	private _v1 = new Vector3()
	private _v2 = new Vector3()
	private _v3 = new Vector3()
	private _mat4 = new Matrix4()

	constructor(props: MarkerProps = {}) {
		const _props = {
			...defaultMarkerProps,
			...props,
		}

		/**
		 * @note it's not safe to make html view optional
		 * @todo smarter approach needed for perf opt
		 *
		 * marker 的性能问题来自于继承了 StandardLayer，却什么功能都没用到。
		 * 其性能优化应该使用更轻的对象，在 Marker Layer上用事件管理Marker，
		 * 而非增加 StandardLayer 的复杂度。
		 */
		// // only initialize GSIView if no html info is provided
		// if (_props.html === undefined || _props.html === null) {
		// 	_props.views = {
		// 		gsi: GSIView,
		// 	}
		// }

		super(_props)

		// basic
		this.camPosition = new Vector3()
		this.camRotationEuler = new Euler()
		this._position = new Vector3()
		this._worldPosition = new Vector3()
		this._worldDirection = new Vector3(0, 0, 1)
		this.earthCenter = new Vector3()
		this._screenXY = new Vector2(-10000, -10000)
		this.inScreen = true
		this.onEarthFrontSide = true

		//
		this._disposed = false

		if (this.view.html) {
			this.element.className = 'marker'
		}

		this.addEventListener('init', (e) => {
			const polaris = e.polaris
			const projection = e.projection
			const timeline = e.timeline
			// 地球球心世界位置
			this.earthCenter.fromArray(projection['_xyz0'] ?? [0, 0, -R]).multiplyScalar(-1)

			/**
			 * Update onViewChange
			 */
			if (this.getProp('highPerfMode')) {
				this._initUpdatingLogic(polaris.cameraProxy, projection, true)
			} else {
				this._initUpdatingLogic(polaris.cameraProxy, projection, false)
			}

			/**
			 * Props listeners
			 */
			this.watchProps(
				['html'],
				() => {
					this.initHtml()
					this.resetInitFrames()
				},
				{ immediate: true }
			)

			this.watchProps(
				['object3d'],
				() => {
					this.group.children.forEach((child) => {
						this.group.children.delete(child)
					})
					this.object3d = this.getProp('object3d')
					this.initObject3d()
					this.resetInitFrames()
				},
				{ immediate: true }
			)

			this.watchProps(
				['lng', 'lat', 'alt'],
				() => {
					this.lnglatalt = [this.getProp('lng'), this.getProp('lat'), this.getProp('alt')]
					this.updateLnglatPosition(projection)
					this.updateWorldPosition()
					this.updateVisibility(polaris.cameraProxy, projection)
					this.updateScreenXY()
					this.updateElement()
					this.resetInitFrames()
				},
				{ immediate: true }
			)

			this.watchProps(
				['offsetX', 'offsetY', 'autoHide'],
				() => {
					this.updateWorldPosition()
					this.updateVisibility(polaris.cameraProxy, projection)
					this.updateScreenXY()
					this.updateElement()
					this.resetInitFrames()
				},
				{ immediate: true }
			)

			this.resetInitFrames()
		})
	}

	show(duration = 1000) {
		const timeline = this.timeline
		if (!timeline) {
			console.warn('timeline not ready')
			return
		}

		if (this.object3d) {
			traverse(this.object3d, (mesh) => {
				if (IR.isRenderable(mesh)) {
					mesh.material.opacity = 0.0
					mesh.material.alphaMode = 'BLEND'
				}
			})
		}
		if (this.html) {
			this.element.style.opacity = '0.0'
		}
		this.visible = true

		timeline.addTrack({
			id: 'Marker Show',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				if (this.object3d) {
					traverse(this.object3d, (mesh) => {
						if (IR.isRenderable(mesh)) {
							mesh.material.opacity = this._matrOpMap.get(mesh.material) ?? 1.0
							mesh.material.alphaMode = this._meshAlphaModes.get(mesh) || ('OPAQUE' as const)
						}
					})
				}
				if (this.html) {
					this.element.style.opacity = '1.0'
				}
				this.visible = true
				this.updateElement()
			},
			onUpdate: (t, p) => {
				if (this.object3d) {
					traverse(this.object3d, (mesh) => {
						if (IR.isRenderable(mesh)) {
							mesh.material.opacity = (this._matrOpMap.get(mesh.material) ?? 1.0) * p
						}
					})
				}
				if (this.html) {
					this.element.style.opacity = p.toString()
				}
			},
		})
	}

	hide(duration = 1000) {
		const timeline = this.timeline
		if (!timeline) {
			console.warn('timeline not ready')
			return
		}

		if (this.object3d) {
			traverse(this.object3d, (mesh) => {
				if (IR.isRenderable(mesh)) {
					mesh.material.alphaMode = 'BLEND'
				}
			})
		}
		if (this.html) {
			this.element.style.opacity = '1.0'
		}

		timeline.addTrack({
			id: 'Marker Hide',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				if (this.object3d) {
					traverse(this.object3d, (mesh) => {
						if (IR.isRenderable(mesh)) {
							mesh.material.opacity = 0.0
						}
					})
				}
				if (this.html) {
					this.element.style.opacity = '0.0'
				}
				this.visible = false
			},
			onUpdate: (t, p) => {
				if (this.object3d) {
					traverse(this.object3d, (mesh) => {
						if (IR.isRenderable(mesh)) {
							mesh.material.opacity = (this._matrOpMap.get(mesh.material) ?? 1.0) * (1 - p)
						}
					})
				}
				if (this.html) {
					this.element.style.opacity = (1 - p).toString()
				}
			},
		})
	}

	pick(polaris: PolarisGSI, canvasCoords: CoordV2, ndc: CoordV2): PickEvent | undefined {
		// 2D DOM picking
		if (this.html) {
			const bbox = this.html.getBoundingClientRect()
			const pbox = polaris.view.html.element.getBoundingClientRect()

			// 扣除Polaris element在屏幕上的偏移量
			const left = Math.round(bbox.left - pbox.left)
			const right = Math.round(left + bbox.width)
			const top = Math.round(bbox.top - pbox.top)
			const bottom = Math.round(top + bbox.height)

			if (
				canvasCoords.x > left &&
				canvasCoords.x < right &&
				canvasCoords.y > top &&
				canvasCoords.y < bottom
			) {
				// HTML has been picked
				return {
					distance: !this.html.style.zIndex ? 0 : parseInt(this.html.style.zIndex),
					point: { x: Infinity, y: Infinity, z: Infinity },
					pointLocal: { x: Infinity, y: Infinity, z: Infinity },
					object: this,
					index: 0,
					data: undefined,
				}
			}
		}

		// TODO: refactor picking
		// 3D object picking
		// if (polaris.pickObject === undefined) return

		// if (this.object3d && this.object3d.geometry) {
		// 	const result = polaris.pickObject(this.object3d, ndc, {
		// 		backfaceCulling: true,
		// 		allInters: false, // The pick process can return as soon as it hits the first triangle
		// 		threshold: 10, // In case the object3d is a line mesh
		// 	})
		// 	if (result.hit && result.intersections) {
		// 		// object3d has been picked
		// 		const inter0 = result.intersections[0]
		// 		return {
		// 			distance: inter0.distance as number,
		// 			point: inter0.point as { x: number; y: number; z: number },
		// 			pointLocal: inter0.pointLocal as { x: number; y: number; z: number },
		// 			object: this,
		// 			index: 0,
		// 			data: undefined,
		// 		}
		// 	}
		// }

		return
	}

	dispose(): void {
		this.group.children.forEach((child) => {
			this.group.children.delete(child)
		})
		if (this.html && this.view.html) {
			while (this.element.lastChild) {
				this.element.removeChild(this.element.lastChild)
			}
			this.element.innerHTML = ''
		}
		this._disposed = true
	}

	private _initUpdatingLogic(cam, projection, perfMode) {
		if (perfMode) {
			this.onViewChange = (cam, polaris) => {
				if (this.framesAfterInit > 5) {
					this.updateWorldPosition(false)
					this.updateVisibility(cam, projection)
					this.updateScreenXY()
					this.updateElement()
				}
			}

			this.onVisibilityChange = () => {
				this.updateVisibility(cam, projection)
			}

			// 每一帧更新位置
			this.onBeforeRender = () => {
				// 每次属性变动就更新前10帧，确保group.worldMatrix已经更新完毕
				if (++this.framesAfterInit < 5) {
					this.updateWorldPosition(false)
					this.updateVisibility(cam, projection)
					this.updateScreenXY()
					this.updateElement()
				} else {
					this.updateScreenXY()
					this.updateElement()
				}
			}
		} else {
			this.onViewChange = (cam, polaris) => {
				this.updateWorldPosition(true)
				this.updateVisibility(cam, projection)
				this.updateScreenXY()
				this.updateElement()
			}

			this.onVisibilityChange = () => {
				this.updateVisibility(cam, projection)
				this.updateElement()
			}
		}
	}

	private initHtml() {
		const html = this.getProp('html')

		if (!html || !this.view.html) return

		this.element.style.position = 'absolute'
		this.element.style.visibility = 'hidden'
		this.element.style.cursor = 'default'
		this.element.style.userSelect = 'none'

		// 允许使用文本作为HTML
		if (html instanceof HTMLElement) {
			this.html = html
			this.html.style.position = 'absolute'
			this.element.appendChild(this.html)
		} else {
			this.element.innerHTML = html
			this.html = this.element
		}

		// Set styles
		if (this.getProp('style')) {
			const style = this.getProp('style')
			for (const key in style) {
				if (style[key] !== undefined) {
					this.element.style[key] = style[key]
				}
			}
		}
	}

	private initObject3d() {
		if (!this.object3d) return

		if (!this.object3d.parent) {
			this.group.children.add(this.object3d)
		} else {
			// 防御式编程，如果被之前的Marker共用了，就克隆一个（克隆的mesh不会有parent）
			this.object3d = deepCloneMesh(this.object3d)
			this.group.children.add(this.object3d)
		}

		// this.preparePicking()

		traverse(this.object3d, (mesh) => {
			if (IR.isRenderable(mesh)) {
				// 保存mesh的原始alphaMode，show和hide结束时还原
				this._meshAlphaModes.set(mesh, mesh.material.alphaMode)
				this._matrOpMap.set(mesh.material, mesh.material.opacity)
			}
		})
	}

	private updateLnglatPosition(projection) {
		this.lnglatalt[0] = this.getProp('lng')
		this.lnglatalt[1] = this.getProp('lat')
		this.lnglatalt[2] = this.getProp('alt')

		// position
		this._position.fromArray(
			projection.project(this.lnglatalt[0], this.lnglatalt[1], this.lnglatalt[2])
		)

		// direction
		this._v1.fromArray(
			projection.project(this.lnglatalt[0], this.lnglatalt[1], this.lnglatalt[2] + 10)
		)
		this._worldDirection.subVectors(this._v1, this._position).normalize()

		// Update lookat direction of object3d
		const orientation = getOrientationMatrix(this.lnglatalt, projection, new Vector3())

		this._mat4
			.identity()
			.makeTranslation(this._position.x, this._position.y, this._position.z)
			.multiply(orientation)

		// @note @todo this is not safe. GSI.SDK should add matrix to transform
		this.group.transform['matrix'] = this._mat4.toArray()

		// 夹角阈值，用来判断visibility
		this.altAngleThres = Math.acos(R / (R + this.getProp('alt')))
	}

	/**
	 * @QianXun FIX & Improve：在marker具有alt属性的情况下，三维坐标的visibility判断更准确（原先只基于地球表面的三维坐标来判断）
	 */
	private updateWorldPosition(forceRecalculate = true) {
		if (!this.inited) {
			console.warn('can not call updateWorldPosition until layer is inited')
			return
		}

		const matPro = this.polaris.matrixProcessor

		let worldMatrix: number[]

		if (forceRecalculate) {
			// Recalculate worldMatrix to get accurate value
			worldMatrix = matPro.getWorldMatrix(this.group)
		} else {
			// Use worldMatrix directly from last frame (unless this is the first frame)
			worldMatrix = matPro.getCachedWorldMatrix(this.group) || matPro.getWorldMatrix(this.group)
		}

		// Extract world position
		if (
			this._worldPosition.x !== worldMatrix[12] ||
			this._worldPosition.y !== worldMatrix[13] ||
			this._worldPosition.z !== worldMatrix[14]
		) {
			this._worldPosition.x = worldMatrix[12]
			this._worldPosition.y = worldMatrix[13]
			this._worldPosition.z = worldMatrix[14]
		}
	}

	private updateVisibility(cam: CameraProxy, projection: Projection) {
		if (this.getProp('autoHide')) {
			if (projection.isSphereProjection) {
				// 球面投影下使用球面切点判断可见性
				const camStates = cam.getCartesianStates()
				this.camPosition.set(
					camStates.position[0] - cam.center[0],
					camStates.position[1] - cam.center[1],
					camStates.position[2] - cam.center[2]
				)
				this.camRotationEuler.fromArray(camStates.rotationEuler)

				// earthCenter至相机方向
				const earthToCam = this._v2.subVectors(this.camPosition, this.earthCenter).normalize()
				const camDis = this.camPosition.distanceTo(this.earthCenter)

				// 夹角阈值(用来判断visibility) = 相机地球相切中心角 + marker相机与地球相切中心角
				this.angleThres = Math.acos(R / camDis) + this.altAngleThres

				const normal = this._v3.subVectors(this._worldPosition, this.earthCenter).normalize()

				if (Math.acos(earthToCam.dot(normal)) > this.angleThres) {
					this.onEarthFrontSide = false
				} else {
					this.onEarthFrontSide = true
				}
			} else {
				this.onEarthFrontSide = true
			}
			this.group.visible = this.onEarthFrontSide && this.visible
			if (this.view.html) {
				this.element.style.visibility = this.onEarthFrontSide && this.visible ? 'inherit' : 'hidden'
			}
		} else {
			this.group.visible = this.visible
			if (this.view.html) {
				this.element.style.visibility = this.visible ? 'inherit' : 'hidden'
			}
		}
	}

	private updateScreenXY() {
		// update screenXY
		const xy = toScreenXY(this, this.lnglatalt[0], this.lnglatalt[1], this.lnglatalt[2])
		if (xy) {
			this._screenXY.copy(xy)
		}

		// 暂时不启用marker自己的html范围判断，交给浏览器自己去判断dom是否应该渲染
		// if (
		// 	this.screenXY[0] < -0.00001 ||
		// 	this.screenXY[0] > polaris.canvasWidth ||
		// 	this.screenXY[1] < -0.00001 ||
		// 	this.screenXY[1] > polaris.canvasHeight
		// ) {
		// 	this.inScreen = false
		// } else {
		// 	this.inScreen = true
		// }
	}

	private updateElement() {
		if (!this.html) return

		const el = this.element

		// visibility check
		if (this.inScreen && this.onEarthFrontSide && this.visible) {
			// el.style.transform = `translate(${this.screenXY.x + this.props.offsetX}px, ${
			// 	this.screenXY.y + this.props.offsetY
			// }px)`

			// Use left/top positioning rather than transform
			const left = this._screenXY.x + this.getProp('offsetX')
			const top = this._screenXY.y + this.getProp('offsetY')

			// FIX: performance issues to get offsetLeft/offsetTop each frame
			el.style.left = `${left}px`
			el.style.top = `${top}px`

			if (el.style.visibility === 'hidden') {
				el.style.visibility = 'inherit'
			}
		} else if (el.style.visibility === 'inherit' || el.style.visibility === 'visible') {
			el.style.visibility = 'hidden'
		}
	}

	private resetInitFrames() {
		this.framesAfterInit = 0
	}

	// seems unnecessary
	// private preparePicking() {
	// 	if (this.object3d && this.object3d.geometry) {
	// 		// Compute BBox & BSphere
	// 		const geom = this.object3d.geometry
	// 		if (!geom.boundingBox) computeBBox(geom)
	// 		if (!geom.boundingSphere) computeBSphere(geom)
	// 	}
	// }
}

/**
 * Temp vars
 */
const _mat4 = new Matrix4()
const _vec3 = new Vector3()
const _vec2 = new Vector2()
