/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { CameraProxy } from 'camera-proxy'
import { Projection } from '@polaris.gl/projection'
import { Vector2, Vector3, Matrix4, Euler } from '@gs.i/utils-math'
import { Mesh } from '@gs.i/frontend-sdk'
import { IR, NodeLike, isDISPOSED, isRenderable } from '@gs.i/schema-scene'
import { deepCloneMesh, earlyStopTraverse, traverse } from './utils'
import { getOrientationMatrix } from './geometry'
// import { computeBBox, computeBSphere } from '@gs.i/utils-geometry'
import { CoordV2, PickInfo } from '@polaris.gl/base'
import { toScreenXY, PolarisGSI, StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'

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
	 * which may cause position/screenXY updating lag (one frame normally)
	 */
	highPerfMode?: boolean

	/**
	 * Whether to test only Marker's object3d only or
	 * test its children when performing raycast
	 */
	recursivePicking?: boolean
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
	recursivePicking: false,
}

/**
 * 单一的Marker，实现在地图上放置三维和二维Marker，可单独使用，一般推荐使用MarkerLayer组件批量生成
 */
export class Marker extends StandardLayer<MarkerProps & typeof defaultMarkerProps> {
	readonly isMarker = true

	private _lnglatalt: [number, number, number]
	get lnglatalt() {
		return this._lnglatalt
	}

	private _html?: HTMLElement
	get html() {
		return this._html
	}

	private _object3d?: NodeLike
	get object3d() {
		return this._object3d
	}

	// lnglat转换过来的position，但不是渲染时真正的realPosition，因为还有经过投影变换同步
	private _position: Vector3
	get position() {
		return this._position
	}

	// realWorldPosition，经过投影同步后的真实世界坐标，从transform.worldMatrix中得到
	private _worldPosition: Vector3
	get worldPosition() {
		return this._worldPosition
	}

	// 只有在球面投影时这个direction才有作用，是从球心到marker位置的方向，用来计算是否被旋转到了背面
	private _worldDirection: Vector3
	get worldDirection() {
		return this._worldDirection
	}

	// Screen coords of html DOM
	private _screenXY: Vector2
	get screenXY() {
		return this._screenXY
	}

	// Visibility vars
	private _camPosition: Vector3
	private _camRotationEuler: Euler
	private _inScreen: boolean
	private _onEarthFrontSide: boolean
	private _altAngleThres: number
	private _angleThres: number
	private _earthCenter: Vector3
	private _framesAfterInit: number

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
		this._camPosition = new Vector3()
		this._camRotationEuler = new Euler()
		this._position = new Vector3()
		this._worldPosition = new Vector3()
		this._worldDirection = new Vector3(0, 0, 1)
		this._earthCenter = new Vector3()
		this._screenXY = new Vector2(-10000, -10000)
		this._inScreen = true
		this._onEarthFrontSide = true

		//
		this._disposed = false

		if (this.view.html) {
			this.element.className = 'marker'
		}

		this.addEventListener('init', (e) => {
			const polaris = e.polaris
			const projection = e.projection

			// 地球球心世界位置
			this._earthCenter.fromArray(projection['_xyz0'] ?? [0, 0, -R]).multiplyScalar(-1)

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
						this.group.remove(child)
					})
					this._object3d = this.getProp('object3d')
					this.initObject3d()
					this.resetInitFrames()
				},
				{ immediate: true }
			)

			this.watchProps(
				['lng', 'lat', 'alt'],
				() => {
					this._lnglatalt = [this.getProp('lng'), this.getProp('lat'), this.getProp('alt') ?? 0]
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

		if (this._object3d) {
			traverse(this._object3d, (mesh) => {
				if (IR.isRenderable(mesh)) {
					mesh.material.opacity = 0.0
					mesh.material.alphaMode = 'BLEND'
				}
			})
		}
		if (this._html) {
			this.element.style.opacity = '0.0'
		}
		this.visible = true

		timeline.addTrack({
			id: 'Marker Show',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				if (this._object3d) {
					traverse(this._object3d, (mesh) => {
						if (IR.isRenderable(mesh)) {
							mesh.material.opacity = this._matrOpMap.get(mesh.material) ?? 1.0
							mesh.material.alphaMode = this._meshAlphaModes.get(mesh) || ('OPAQUE' as const)
						}
					})
				}
				if (this._html) {
					this.element.style.opacity = '1.0'
				}
				this.visible = true
				this.updateElement()
			},
			onUpdate: (t, p) => {
				if (this._object3d) {
					traverse(this._object3d, (mesh) => {
						if (IR.isRenderable(mesh)) {
							mesh.material.opacity = (this._matrOpMap.get(mesh.material) ?? 1.0) * p
						}
					})
				}
				if (this._html) {
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

		if (this._object3d) {
			traverse(this._object3d, (mesh) => {
				if (IR.isRenderable(mesh)) {
					mesh.material.alphaMode = 'BLEND'
				}
			})
		}
		if (this._html) {
			this.element.style.opacity = '1.0'
		}

		timeline.addTrack({
			id: 'Marker Hide',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				if (this._object3d) {
					traverse(this._object3d, (mesh) => {
						if (IR.isRenderable(mesh)) {
							mesh.material.opacity = 0.0
						}
					})
				}
				if (this._html) {
					this.element.style.opacity = '0.0'
				}
				this.visible = false
			},
			onUpdate: (t, p) => {
				if (this._object3d) {
					traverse(this._object3d, (mesh) => {
						if (IR.isRenderable(mesh)) {
							mesh.material.opacity = (this._matrOpMap.get(mesh.material) ?? 1.0) * (1 - p)
						}
					})
				}
				if (this._html) {
					this.element.style.opacity = (1 - p).toString()
				}
			},
		})
	}

	/**
	 * @note currently only supports object3d with geometry mode of TRIANGLES
	 * @todo support other geometry modes
	 */
	raycast(polaris: PolarisGSI, canvasCoords: CoordV2, ndc: CoordV2): PickInfo | undefined {
		// 2D DOM picking
		if (this._html) {
			const bbox = this._html.getBoundingClientRect()
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
					distance: !this._html.style.zIndex ? 0 : parseInt(this._html.style.zIndex),
					point: { x: Infinity, y: Infinity, z: Infinity },
					pointLocal: { x: Infinity, y: Infinity, z: Infinity },
					object: this,
					index: 0,
					data: undefined,
				}
			}
		}

		// 3D object picking
		if (!this._object3d) return
		const recursive = this.getProp('recursivePicking')
		if (!recursive) {
			return this._raycastObject3d(this._object3d, polaris, ndc)
		}
		// traverse node
		let raycastResult: PickInfo | undefined
		earlyStopTraverse(this._object3d, (node) => {
			raycastResult = this._raycastObject3d(node, polaris, ndc)
			if (raycastResult) return true // stop traversing
			return
		})
		return raycastResult
	}

	dispose(): void {
		this.group.children.forEach((child) => {
			this.group.children.delete(child)
		})
		if (this._html && this.view.html) {
			while (this.element.lastChild) {
				this.element.removeChild(this.element.lastChild)
			}
			this.element.innerHTML = ''
		}
		this._disposed = true
	}

	private _initUpdatingLogic(cam, projection, perfMode) {
		if (perfMode) {
			this.addEventListener('viewChange', (e) => {
				const cam = e.cameraProxy
				if (this._framesAfterInit > 5) {
					this.updateWorldPosition(false)
					this.updateVisibility(cam, projection)
					this.updateScreenXY()
					this.updateElement()
				}
			})

			this.addEventListener('visibilityChange', () => {
				this.updateVisibility(cam, projection)
			})

			this.addEventListener('beforeRender', () => {
				// 每次属性变动就更新前10帧，确保group.worldMatrix已经更新完毕
				if (++this._framesAfterInit < 5) {
					this.updateWorldPosition(false)
					this.updateVisibility(cam, projection)
					this.updateScreenXY()
					this.updateElement()
				} else {
					this.updateScreenXY()
					this.updateElement()
				}
			})
		} else {
			this.addEventListener('viewChange', (e) => {
				const cam = e.cameraProxy
				this.updateWorldPosition(true)
				this.updateVisibility(cam, projection)
				this.updateScreenXY()
				this.updateElement()
			})

			this.addEventListener('visibilityChange', () => {
				this.updateVisibility(cam, projection)
				this.updateElement()
			})
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
			this._html = html
			this._html.style.position = 'absolute'
			this.element.appendChild(this._html)
		} else {
			this.element.innerHTML = html
			this._html = this.element
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
		if (!this._object3d) return

		if (!this._object3d.parent) {
			this.group.add(this._object3d)
		} else {
			// 防御式编程，如果被之前的Marker共用了，就克隆一个（克隆的mesh不会有parent）
			this._object3d = deepCloneMesh(this._object3d)
			this.group.add(this._object3d)
		}

		// this.preparePicking()

		traverse(this._object3d, (mesh) => {
			if (IR.isRenderable(mesh)) {
				// 保存mesh的原始alphaMode，show和hide结束时还原
				this._meshAlphaModes.set(mesh, mesh.material.alphaMode)
				this._matrOpMap.set(mesh.material, mesh.material.opacity)
			}
		})
	}

	private updateLnglatPosition(projection) {
		this._lnglatalt[0] = this.getProp('lng')
		this._lnglatalt[1] = this.getProp('lat')
		this._lnglatalt[2] = this.getProp('alt') ?? 0

		// position
		this._position.fromArray(
			projection.project(this._lnglatalt[0], this._lnglatalt[1], this._lnglatalt[2])
		)

		// direction
		this._v1.fromArray(
			projection.project(this._lnglatalt[0], this._lnglatalt[1], this._lnglatalt[2] + 10)
		)
		this._worldDirection.subVectors(this._v1, this._position).normalize()

		// Update lookat direction of object3d
		const orientation = getOrientationMatrix(this._lnglatalt, projection, new Vector3())

		this._mat4
			.identity()
			.makeTranslation(this._position.x, this._position.y, this._position.z)
			.multiply(orientation)

		// @note @todo this is not safe. GSI.SDK should add matrix to transform
		this.group.transform['matrix'] = this._mat4.toArray()
		this.group.transform.version++

		// 夹角阈值，用来判断visibility
		this._altAngleThres = Math.acos(R / (R + this.getProp('alt') ?? 0))
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
				this._camPosition.set(
					camStates.position[0] - cam.center[0],
					camStates.position[1] - cam.center[1],
					camStates.position[2] - cam.center[2]
				)
				this._camRotationEuler.fromArray(camStates.rotationEuler)

				// earthCenter至相机方向
				const earthToCam = this._v2.subVectors(this._camPosition, this._earthCenter).normalize()
				const camDis = this._camPosition.distanceTo(this._earthCenter)

				// 夹角阈值(用来判断visibility) = 相机地球相切中心角 + marker相机与地球相切中心角
				this._angleThres = Math.acos(R / camDis) + this._altAngleThres

				const normal = this._v3.subVectors(this._worldPosition, this._earthCenter).normalize()

				if (Math.acos(earthToCam.dot(normal)) > this._angleThres) {
					this._onEarthFrontSide = false
				} else {
					this._onEarthFrontSide = true
				}
			} else {
				this._onEarthFrontSide = true
			}
			this.group.visible = this._onEarthFrontSide && this.visible
			if (this.view.html) {
				this.element.style.visibility =
					this._onEarthFrontSide && this.visible ? 'inherit' : 'hidden'
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
		const xy = toScreenXY(this, this._lnglatalt[0], this._lnglatalt[1], this._lnglatalt[2])
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
		if (!this._html) return

		const el = this.element

		// visibility check
		if (this._inScreen && this._onEarthFrontSide && this.visible) {
			// el.style.transform = `translate(${this.screenXY.x + this.props.offsetX}px, ${
			// 	this.screenXY.y + this.props.offsetY
			// }px)`

			// Use left/top positioning rather than transform
			const left = this._screenXY.x + this.getProp('offsetX')
			const top = this._screenXY.y + this.getProp('offsetY')

			// FIX: performance issues to get offsetLeft/offsetTop each frame
			el.style.transform = `translate(${left}px, ${top}px)`
			// el.style.left = `${left}px`
			// el.style.top = `${top}px`

			if (el.style.visibility === 'hidden') {
				el.style.visibility = 'inherit'
			}
		} else if (el.style.visibility === 'inherit' || el.style.visibility === 'visible') {
			el.style.visibility = 'hidden'
		}
	}

	private resetInitFrames() {
		this._framesAfterInit = 0
	}

	private _raycastObject3d(
		object3d: IR.NodeLike,
		polaris: PolarisGSI,
		ndc: CoordV2
	): PickInfo | undefined {
		const node = object3d

		if (!isRenderable(node)) return

		const geom = node.geometry
		if (!geom) return
		if (geom.mode !== 'TRIANGLES') {
			// ONLY support geometry mode 'TRIANGLES'
			return
		}

		// check attr disposable
		if (!geom.attributes.position || isDISPOSED(geom.attributes.position.array)) {
			return
		}
		if (geom.indices && isDISPOSED(geom.indices.array)) {
			return
		}

		const result = polaris.raycastRenderableNode(node, ndc, {
			allInters: false,
		})

		if (result.hit && result.intersections && result.intersections.length > 0) {
			// object3d has been picked
			const inter0 = result.intersections[0]
			return {
				distance: inter0.distance as number,
				point: inter0.point as { x: number; y: number; z: number },
				pointLocal: inter0.pointLocal as { x: number; y: number; z: number },
				object: this,
				index: 0,
				data: undefined,
			}
		}

		return
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
