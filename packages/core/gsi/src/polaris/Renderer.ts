/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * Polaris 渲染器基类（3D场景）
 * 在此接口的基础上实现
 * - LiteRenderer（three js）
 * - GL2Renderer （GL2）
 * - HDRenderer （HDPipeline）
 * 除非特殊说明，不然场景都应该能被多种渲染器渲染
 * 此类型的设计必须考虑到可能的兼容性问题和扩展性，不能直接使用 three 的设计
 *
 * @constructs
 * 输入配置项和场景，渲染内容到画布上
 *
 * @key
 * - 输出控制，延迟输出是必须的
 * - 不同流水线可能对输入场景所做的处理
 * - 这里的扩展能力应该减轻 Layer 开发的复杂度
 *
 * @todo
 * - render的调用是放在这里还是 Polaris 中
 * - 事件回调是放在这里还是 Polaris 中
 * - 阴影等配置，虽然可以放在场景内，但是和渲染器强相关，可以选择
 * 		- [] 写这里，对外提供兼容的接口
 * 		- [] 写 Polaris 里
 *
 * @so
 * 先直接实现一个Polaris，然后看哪些部分应该拆解到这里
 */

import type { CameraProxy } from 'camera-proxy'

export abstract class Renderer {
	readonly isRenderer = true

	declare canvas: HTMLCanvasElement
	/**
	 * render one frame to canvas
	 */
	abstract render(): void

	abstract updateCamera(cam: CameraProxy): void

	abstract getNDC(worldPosition: { x: number; y: number; z: number }, cam: CameraProxy): number[]

	abstract resize(width, height, ratio?): void

	/**
	 * get imagedata from current canvas
	 */
	abstract capture(): string
	/**
	 * 异步版本，二选一S
	 */
	// abstract async capture(): Promise<string>

	/**
	 * 更新场景配置
	 */
	abstract updateConfig(props: { [key: string]: any }): void

	abstract getCapabilities(): {
		pointSizeRange: [number, number]
		lineWidthRange: [number, number]
		maxVertexAttributes: number
		maxVaryingVectors: number
		[name: string]: any
	}

	/**
	 * 尽可能地回收所有资源
	 */
	dispose(): void {}
}

export type PickResult = {
	/**
	 * 射线是否击中物体
	 *
	 * @type {boolean}
	 */
	hit: boolean

	/**
	 * 碰撞信息集合
	 */
	intersections?: Array<{
		/**
		 * 射线碰撞点世界坐标
		 *
		 * @type {{ x: number; y: number; z: number }}
		 */
		point?: { x: number; y: number; z: number }

		/**
		 * 射线碰撞点local坐标
		 *
		 * @type {{ x: number; y: number; z: number }}
		 */
		pointLocal?: { x: number; y: number; z: number }

		/**
		 * 射线碰撞点的距离
		 *
		 * @type {number}
		 */
		distance?: number

		/**
		 * 射线碰撞到的三角面的索引，如果是sprite就表示是第几个
		 *
		 * @type {number}
		 */
		index?: number
	}>
}
