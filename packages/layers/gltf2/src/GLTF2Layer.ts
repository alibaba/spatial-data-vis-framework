/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * 基类。
 * 可以使用 Layer，自己添加需要的 view；
 * 也可以使用 StandardLayer，添加好的 gsiView 和 HtmlView 的 Layer，懒人福音。
 */
import { StandardLayer, StandardLayerProps } from '@polaris.gl/base-gsi'

/**
 * 内部逻辑依赖.
 * 整个项目的 Layer 最好保持一致，使用 GL2.THREE(based on v94) 或者 THREE@latest.
 * 如果希望 Layer 能够跨渲染器通用，则应该使用 Renderable(GSI) 接口。
 */

import { GLTF2Loader } from '@gs.i/frontend-gltf2'
import { BaseNode } from '@gs.i/schema-scene'
import { GLM } from '@gs.i/utils-gltf2'

/**
 * 配置项 默认值
 */
const defaultProps = {
	/**
	 * 是否自动 旋转 X 轴
	 * polaris 以 xy 平面作为地面，与制作 gltf2 的建模软件不同
	 */
	rotateX: true,
	center: [120, 20], // 中心经纬度
	name: 'GLTFLayer',
}

/**
 * 配置项 interface
 */
export interface GLTF2LayerProps extends StandardLayerProps, Partial<typeof defaultProps> {}

export class GLTF2Layer extends StandardLayer {
	props: GLTF2LayerProps

	/**
	 * @todo 这个可以放在全局公用
	 */
	loader: GLTF2Loader

	constructor(props: GLTF2LayerProps = {}) {
		props = {
			...defaultProps,
			...props,
		}
		super(props)

		this.props = props

		if (this.props.rotateX) {
			this.view.gsi.group.transform.rotation.x = Math.PI / 2
		}

		this.loader = new GLTF2Loader()
	}

	/**
	 * 将 arraybuffer 格式 的 GLB 转换为 Mesh
	 * @param glb gltf2 的 binary 形式
	 */
	parseGLB(glb: ArrayBuffer): BaseNode {
		const glm = this.loader.glbToGLM(glb)
		const mesh = this.loader.parse(glm)
		return mesh
	}

	/**
	 * 将 js对象 格式 的 gltf2 转换为 Mesh
	 * @param glm gltf2 的 memory 形式
	 */
	parseGLM(glm: GLM): BaseNode {
		const mesh = this.loader.parse(glm)
		return mesh
	}

	/**
	 * arraybuffer 格式 的 GLB 转换为 js对象 格式 的 gltf2
	 * @param glb gltf2 的 binary 形式
	 */
	glbToGLM(glb: ArrayBuffer): GLM {
		return this.loader.glbToGLM(glb)
	}

	/**
	 * 下载并解析 gltf2 binary （glb），放入场景中
	 * @param url
	 */
	async loadGLB(url: string): Promise<BaseNode> {
		const res = await fetch(url)
		const glb = await res.arrayBuffer()
		const meshes = this.parseGLB(glb)
		// this.view.gsi.group.add(mesh)
		this.group.add(meshes)
		return meshes
	}
}
