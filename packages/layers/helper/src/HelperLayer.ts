/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * 基类。
 * 可以使用 Layer，自己添加需要的 view；
 * 也可以使用 StandardLayer，添加好的 gsiView 和 HtmlView 的 Layer，懒人福音。
 */
import { StandardLayer, StandardLayerProps } from '@polaris.gl/layer-std'

/**
 * 内部逻辑依赖.
 * 整个项目的 Layer 最好保持一致，使用 GL2.THREE(based on v94) 或者 THREE@latest.
 * 如果希望 Layer 能够跨渲染器通用，则应该使用 Renderable(GSI) 接口。
 */
import { Mesh, Geom, MatrUnlit, Attr } from '@gs.i/frontend-sdk'
import { buildBox } from '@gs.i/utils-geom-builders'

/**
 * 配置项 默认值
 */
const defaultProps = {
	length: 10000,
	box: true,
}

/**
 * 配置项 interface
 */
export type HelperLayerProps = StandardLayerProps & typeof defaultProps

/**
 * 辅助Layer，显示坐标轴等
 */
export class HelperLayer extends StandardLayer<HelperLayerProps> {
	axises: Mesh
	box?: Mesh
	props: any

	constructor(props: Partial<HelperLayerProps> = {}) {
		const _props = {
			...defaultProps,
			...props,
		}
		super(_props)

		this.props = _props

		// 在 场景中加入 坐标轴
		this.listenProps(['length', 'box'], () => {
			if (this.axises) {
				this.group.remove(this.axises)
			}

			const length = this.getProps('length')
			const lineGeom = new Geom({
				mode: 'LINES',
				attributes: {
					position: new Attr(
						new Float32Array([
							0.0,
							0.0,
							0.0,
							length,
							0.0,
							0.0,
							0.0,
							0.0,
							0.0,
							0.0,
							length,
							0.0,
							0.0,
							0.0,
							0.0,
							0.0,
							0.0,
							length,
						]),
						3
					),
					vertexColor: new Attr(
						new Float32Array([
							1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0,
							1.0,
						]),
						3
					),
				},
			})

			const lineMatr = new MatrUnlit({})

			lineMatr.vertGlobal = `
				attribute vec3 vertexColor;
				varying vec3 vColor;
			`
			lineMatr.fragGlobal = `
				varying vec3 vColor;
			`
			lineMatr.vertGeometry = `vColor = vertexColor;`
			lineMatr.fragOutput = `fragColor = vec4(vColor, 1.0);`

			this.axises = new Mesh({
				geometry: lineGeom,
				material: lineMatr,
			})

			this.group.add(this.axises)

			if (this.box) {
				this.group.remove(this.box)
				this.box = undefined
			}

			if (this.getProps('box')) {
				const geom = buildBox({
					width: this.getProps('length') * 0.1,
					height: this.getProps('length') * 0.1,
					depth: this.getProps('length') * 0.1,
				})

				this.box = new Mesh({
					geometry: geom,
					material: new MatrUnlit({ baseColorFactor: { r: 1, g: 0, b: 1 } }),
				})

				this.group.add(this.box)
			}
		})
	}

	init() {}
}
