/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Projection } from '@polaris.gl/projection'
import { Mesh, Geom, Attr, MatrUnlit } from '@gs.i/frontend-sdk'
/**
 * 基类。
 * 可以使用 Layer，自己添加需要的 view；
 * 也可以使用 STDLayer，添加好的 gsiView 和 HtmlView 的 Layer，懒人福音。
 */
import { STDLayer, STDLayerProps } from '@polaris.gl/layer-std'

/**
 * 内部逻辑依赖.
 * 整个项目的 Layer 最好保持一致，使用 GL2.THREE(based on v94) 或者 THREE@latest.
 * 如果希望 Layer 能够跨渲染器通用，则应该使用 Renderable(GSI) 接口。
 */

import { GLTF2Loader } from '@gs.i/frontend-gltf2'
import { MeshDataType } from '@gs.i/schema'
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
}

/**
 * 配置项 interface
 */
export interface GLTF2LayerProps extends STDLayerProps, Partial<typeof defaultProps> {}

export class GLTF2Layer extends STDLayer {
	props: GLTF2LayerProps
	projection: any

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

		this.name = this.group.name = 'GLTFLayer'

		if (this.props.rotateX) {
			this.view.gsi.group.transform.rotation.x = Math.PI / 2
		}

		this.loader = new GLTF2Loader()
	}

	init(projection, timeline, polaris) {
		this.projection = projection
	}

	/**
	 * 将 arraybuffer 格式 的 GLB 转换为 Mesh
	 * @param glb gltf2 的 binary 形式
	 */
	parseGLB(glb: ArrayBuffer): MeshDataType {
		const glm = this.loader.glbToGLM(glb)
		const mesh = this.loader.parse(glm)
		return mesh
	}

	/**
	 * 将 js对象 格式 的 gltf2 转换为 Mesh
	 * @param glm gltf2 的 memory 形式
	 */
	parseGLM(glm: GLM): MeshDataType {
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
	async loadGLB(url: string): Promise<MeshDataType> {
		const res = await fetch(url)
		const glb = await res.arrayBuffer()
		const meshes = this.parseGLB(glb)
		// this.view.gsi.group.add(mesh)
		this.group.add(meshes)
		return meshes
	}
}
