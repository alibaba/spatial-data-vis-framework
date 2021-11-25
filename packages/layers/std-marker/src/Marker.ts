/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Projection } from '@polaris.gl/projection'
import { CameraProxy } from 'camera-proxy'
import { STDLayer, STDLayerProps } from '@polaris.gl/layer-std'
import { Vector2, Vector3, Matrix4, Euler } from '@gs.i/utils-math'
import { Mesh } from '@gs.i/frontend-sdk'
import { MeshDataType } from '@gs.i/schema'
import { deepCloneMesh, traverseMesh, getOrientationMatrix } from '@polaris.gl/utils'
import { computeBBox, computeBSphere } from '@gs.i/utils-geometry'

const R = 6378137 // 常量 - 地球半径
const _v1 = new Vector3()
const _v2 = new Vector3()
const _v3 = new Vector3()
const _mat4 = new Matrix4()

/**
 * 默认配置项
 */
export interface MarkerProps extends STDLayerProps {
	lng?: number
	lat?: number
	alt?: number
	offsetX?: number
	offsetY?: number
	html?: HTMLElement | string
	style?: any
	object3d?: Mesh
	autoHide?: boolean
}

/**
 * 配置项 默认值
 */
export const defaultMarkerProps: MarkerProps = {
	lng: 0,
	lat: 0,
	alt: 0,
	html: undefined,
	offsetX: 0,
	offsetY: 0,
	object3d: undefined,
	autoHide: false,
}

/**
 * 单一的Marker，实现在地图上放置三维和二维Marker，可单独使用，一般推荐使用MarkerLayer组件批量生成
 */
export class Marker extends STDLayer {
	props: any
	lnglatalt: [number, number, number]
	html?: HTMLElement
	object3d?: MeshDataType

	// lnglat转换过来的position，但不是渲染时真正的realPosition，因为还有经过投影变换同步
	position: Vector3
	// realWorldPosition，经过投影同步后的真实世界坐标，从transform.worldMatrix中得到
	worldPosition: Vector3
	// 只有在球面投影时这个direction才有作用，是从球心到marker位置的方向，用来计算是否被旋转到了背面
	worldDirection: Vector3
	// Screen coords of html DOM
	screenXY: Vector2

	// Visibility
	camPosition: Vector3
	camRotationEuler: Euler
	inScreen: boolean
	onEarthFrontSide: boolean
	altAngleThres: number
	angleThres: number
	earthCenter: Vector3
	framesAfterInit: number

	// Animation
	meshAlphaModes: Map<Mesh, string>

	private _disposed: boolean
	get disposed() {
		return this._disposed
	}

	constructor(props: MarkerProps = {}) {
		const _props = {
			...defaultMarkerProps,
			...props,
		}
		super(_props)
		this.props = _props

		this.camPosition = new Vector3()
		this.camRotationEuler = new Euler()
		this.position = new Vector3()
		this.worldPosition = new Vector3()
		this.worldDirection = new Vector3(0, 0, 1)
		this.earthCenter = new Vector3()
		this.screenXY = new Vector2(-10000, -10000)
		this.inScreen = true
		this.onEarthFrontSide = true

		this.meshAlphaModes = new Map()

		this._disposed = false

		// group
		this.name = this.group.name = 'marker'
		this.element.className = 'marker'
	}

	/**
	 * Implemented
	 */
	init(projection, timeline, polaris) {
		// 地球球心世界位置
		this.earthCenter.fromArray(projection['_xyz0'] ?? [0, 0, -R]).multiplyScalar(-1)

		/**
		 * Update onViewChange
		 */
		this.onViewChange = (cam, polaris) => {
			this.updateVisibility(cam, projection)
			this.updateScreenXY()
			this.updateElement()
		}

		this.onVisibilityChange = () => {
			this.updateVisibility(polaris.cameraProxy, projection)
		}

		// 每一帧更新位置
		this.onBeforeRender = () => {
			// 每次属性变动就更新前10帧，确保group.worldMatrix已经更新完毕
			if (++this.framesAfterInit < 10) {
				this.updateVisibility(polaris.cameraProxy, projection)
				this.updateScreenXY()
				this.updateElement()
			} else {
				this.updateScreenXY()
				this.updateElement()
			}
		}

		/**
		 * Props listeners
		 */
		this.listenProps(['html'], () => {
			this.initHtml()
			this.resetInitFrames()
		})

		this.listenProps(['object3d'], () => {
			this.group.children.forEach((child) => {
				this.group.remove(child)
			})
			this.object3d = this.getProps('object3d')
			this.initObject3d()
			this.resetInitFrames()
		})

		this.listenProps(['lng', 'lat', 'alt'], (event) => {
			event.type.split(',').forEach((key) => {
				if (this.getProps(key) !== undefined) this.props[key] = this.getProps(key)
			})
			this.lnglatalt = [this.getProps('lng'), this.getProps('lat'), this.getProps('alt')]

			this.updateLnglatPosition(projection)
			this.updateScreenXY()
			this.updateElement()
			this.resetInitFrames()
		})

		this.listenProps(['offsetX', 'offsetY', 'autoHide'], (event) => {
			event.type.split(',').forEach((key) => {
				if (this.getProps(key) !== undefined) this.props[key] = this.getProps(key)
			})
			this.updateScreenXY()
			this.updateElement()
			this.resetInitFrames()
		})

		this.resetInitFrames()
	}

	async show(duration = 1000) {
		if (this.object3d) {
			traverseMesh(this.object3d, (mesh) => {
				if (mesh.material) {
					mesh.material.opacity = 0.0
					mesh.material.alphaMode = 'BLEND'
				}
			})
		}
		if (this.html) {
			this.element.style.opacity = '0.0'
		}
		this.visible = true

		const timeline = await this.getTimeline()
		timeline.addTrack({
			id: 'Marker Show',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				if (this.object3d) {
					traverseMesh(this.object3d, (mesh) => {
						if (mesh.material) {
							mesh.material.opacity = 1.0
							mesh.material.alphaMode = this.meshAlphaModes.get(mesh) || 'OPAQUE'
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
					traverseMesh(this.object3d, (mesh) => {
						if (mesh.material) {
							mesh.material.opacity = p
						}
					})
				}
				if (this.html) {
					this.element.style.opacity = p.toString()
				}
			},
		})
	}

	async hide(duration = 1000) {
		if (this.object3d) {
			traverseMesh(this.object3d, (mesh) => {
				if (mesh.material) {
					mesh.material.alphaMode = 'BLEND'
					mesh.material.opacity = 1.0
				}
			})
		}
		if (this.html) {
			this.element.style.opacity = '1.0'
		}

		const timeline = await this.getTimeline()
		timeline.addTrack({
			id: 'Marker Hide',
			startTime: timeline.currentTime,
			duration: duration,
			onStart: () => {},
			onEnd: () => {
				if (this.object3d) {
					traverseMesh(this.object3d, (mesh) => {
						if (mesh.material) {
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
					traverseMesh(this.object3d, (mesh) => {
						if (mesh.material) {
							mesh.material.opacity = 1 - p
						}
					})
				}
				if (this.html) {
					this.element.style.opacity = (1 - p).toString()
				}
			},
		})
	}

	private initHtml() {
		this.html = this.getProps('html')

		if (!this.html) return

		this.element.style.position = 'absolute'
		this.element.style.visibility = 'hidden'
		this.element.style.cursor = 'default'
		this.element.style.userSelect = 'none'

		// 允许使用文本作为HTML
		if (this.html instanceof HTMLElement) {
			this.html.style.position = 'absolute'
			this.element.appendChild(this.html)
		} else {
			this.element.innerHTML = this.html
			this.html = this.element
		}

		// Set styles
		if (this.getProps('style')) {
			const style = this.getProps('style')
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
			this.group.add(this.object3d)
		} else {
			// 防御式编程，如果被之前的Marker共用了，就克隆一个（克隆的mesh不会有parent）
			this.object3d = deepCloneMesh(this.object3d)
			this.group.add(this.object3d)
		}

		this.preparePicking()

		traverseMesh(this.object3d, (mesh) => {
			if (mesh.material) {
				// 保存mesh的原始alphaMode，show和hide结束时还原
				this.meshAlphaModes.set(mesh, mesh.material.alphaMode)
			}
		})
	}

	private updateLnglatPosition(projection) {
		this.lnglatalt[0] = this.getProps('lng')
		this.lnglatalt[1] = this.getProps('lat')
		this.lnglatalt[2] = this.getProps('alt')

		// position
		this.position.fromArray(
			projection.project(this.lnglatalt[0], this.lnglatalt[1], this.lnglatalt[2])
		)

		// direction
		_v1.fromArray(projection.project(this.lnglatalt[0], this.lnglatalt[1], this.lnglatalt[2] + 10))
		this.worldDirection.subVectors(_v1, this.position).normalize()

		// Update lookat direction of object3d
		const orientation = getOrientationMatrix(this.lnglatalt, projection, new Vector3())

		_mat4
			.identity()
			.makeTranslation(this.position.x, this.position.y, this.position.z)
			.multiply(orientation)
		this.group.transform.matrix = _mat4.toArray()

		// 夹角阈值，用来判断visibility
		this.altAngleThres = Math.acos(R / (R + this.getProps('alt')))
	}

	/**
	 * @QianXun FIX & Improve：在marker具有alt属性的情况下，三维坐标的visibility判断更准确（原先只基于地球表面的三维坐标来判断）
	 */
	private updateVisibility(cam: CameraProxy, projection: Projection) {
		const worldMatrix = this.group.transform.worldMatrix
		if (!worldMatrix) return
		if (
			this.worldPosition.x !== worldMatrix[12] ||
			this.worldPosition.y !== worldMatrix[13] ||
			this.worldPosition.z !== worldMatrix[14]
		) {
			this.worldPosition.x = worldMatrix[12]
			this.worldPosition.y = worldMatrix[13]
			this.worldPosition.z = worldMatrix[14]
		}

		if (this.props.autoHide) {
			if (projection.isShpereProjection) {
				// 球面投影下使用球面切点判断可见性
				const camStates = cam.getCartesianStates()
				this.camPosition.set(
					camStates.position[0] - cam.center[0],
					camStates.position[1] - cam.center[1],
					camStates.position[2] - cam.center[2]
				)
				this.camRotationEuler.fromArray(camStates.rotationEuler)

				// earthCenter至相机方向
				const earthToCam = _v2.subVectors(this.camPosition, this.earthCenter).normalize()
				const camDis = this.camPosition.distanceTo(this.earthCenter)

				// 夹角阈值(用来判断visibility) = 相机地球相切中心角 + marker相机与地球相切中心角
				this.angleThres = Math.acos(R / camDis) + this.altAngleThres

				const normal = _v3.subVectors(this.worldPosition, this.earthCenter).normalize()

				if (Math.acos(earthToCam.dot(normal)) > this.angleThres) {
					this.onEarthFrontSide = false
				} else {
					this.onEarthFrontSide = true
				}
			} else {
				this.onEarthFrontSide = true
			}
			this.group.visible = this.onEarthFrontSide && this.visible
			this.element.style.visibility = this.onEarthFrontSide && this.visible ? 'inherit' : 'hidden'
		} else {
			this.group.visible = this.visible
			this.element.style.visibility = this.visible ? 'inherit' : 'hidden'
		}
	}

	private updateScreenXY() {
		const worldMatrix = this.group.transform.worldMatrix
		if (!worldMatrix) return

		if (
			this.worldPosition.x !== worldMatrix[12] ||
			this.worldPosition.y !== worldMatrix[13] ||
			this.worldPosition.z !== worldMatrix[14]
		) {
			this.worldPosition.x = worldMatrix[12]
			this.worldPosition.y = worldMatrix[13]
			this.worldPosition.z = worldMatrix[14]
		}

		// update screenXY
		const xy = this.toScreenXY(this.lnglatalt[0], this.lnglatalt[1], this.lnglatalt[2])
		if (xy) {
			this.screenXY.copy(xy)
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
			const left = this.screenXY.x + this.props.offsetX
			const top = this.screenXY.y + this.props.offsetY
			if (el.offsetLeft !== left || el.offsetTop !== top) {
				el.style.left = `${left}px`
				el.style.top = `${top}px`
			}

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

	private preparePicking() {
		if (this.object3d && this.object3d.geometry) {
			// Compute BBox & BSphere
			const geom = this.object3d.geometry
			if (!geom.boundingBox) computeBBox(geom)
			if (!geom.boundingSphere) computeBSphere(geom)
		}
	}

	dispose(): void {
		this.group.children.forEach((child) => {
			this.group.remove(child)
		})
		if (this.html) {
			while (this.element.lastChild) {
				this.element.removeChild(this.element.lastChild)
			}
			this.element.innerHTML = ''
		}
		this._disposed = true
	}
}
