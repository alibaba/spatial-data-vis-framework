/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * layer view 的逻辑 需要复用，
 * 但是 typescript 中 mixin 和 decoration 都会造成一定程度的 interface 混乱
 * 因此在这里把constructor里增加的逻辑拆成函数，
 */

import { Timeline } from 'ani-timeline'
import { Projection } from '@polaris.gl/projection'
import {
	Layer,
	LayerProps,
	PickEventResult,
	AbstractLayerEvents,
	AbstractPolaris,
	CoordV2,
	PickInfo,
} from '@polaris.gl/base'
import { GSIView } from './view/GsiView'
import { HtmlView } from './view/HtmlView'
import { isRenderable } from '@gs.i/schema-scene'
import type { PolarisGSI } from '../polaris/index'

// experimental methods
export * from './utils'

// override Node & EventDispatcher interfaces to hide underlying implements.
export interface StandardLayer {
	get parent(): StandardLayer | PolarisGSI | null
	get children(): Set<StandardLayer>
	get root(): StandardLayer | PolarisGSI | null
	add(child: StandardLayer): void
	remove(child: StandardLayer): void
	traverse(handler: (node: StandardLayer) => void): void
	set onAdd(f: (parent: any) => void) // workaround ts bug
	set onRemove(f: (parent: any) => void)
}

/**
 * 配置项 interface
 */
export interface StandardLayerProps extends LayerProps {
	/**
	 * @deprecated @unreliable may break internal 3d scene
	 */
	depthTest?: boolean
	/**
	 * @deprecated @unreliable may break internal 3d scene
	 */
	renderOrder?: number

	/**
	 * whether this layer's gsi view should be raycast-ed
	 */
	pickable?: boolean

	/**
	 * @deprecated use {@link .addEventListener("pick")} instead
	 */
	onPicked?: (event: PickEventResult | undefined) => void
	/**
	 * @deprecated use {@link .addEventListener("hover")} instead
	 */
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
 * Standard Layer
 * 标准 Layer，包含 GSIView 作为 3D 容器，HTMLView 作为 2D 容器
 */
export class StandardLayer<
	TProps extends StandardLayerProps = any,
	TEventTypes extends AbstractLayerEvents = AbstractLayerEvents
> extends Layer<TProps, TEventTypes> {
	readonly isStandardLayer = true

	view: { gsi: GSIView; html: HtmlView }

	/**
	 * only available after init. check .inited first
	 */
	protected polaris: PolarisGSI
	/**
	 * only available after init. check .inited first
	 */
	protected timeline: Timeline
	/**
	 * only available after init. check .inited first
	 */
	protected projection: Projection

	constructor(props: TProps) {
		super(props)

		// @note
		// 不应该允许选择 standard layer 的 view
		// 唯一出现过的需求是：marker layer不需要html，可选view用于性能优化。
		// 普通layer 如果可以随意删掉view，会导致子layer挂载时出错
		// 如果需要性能优化，选择其他方案

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

		this.addEventListener('init', (e) => {
			this.polaris = e.polaris as PolarisGSI
			this.timeline = e.timeline
			this.projection = e.projection
		})

		// @note
		// Use AfterInit to make sure this happens after scene
		// construction which happens when InitEvent.
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
	get group() {
		return this.view.gsi.group
	}

	/**
	 * root of html elements
	 * @note all renderable contents shall be put here
	 */
	get element() {
		return this.view.html.element
	}

	// /**
	//  * Highlight API
	//  *
	//  * @memberof StandardLayer
	//  */
	// highlightByIndices: (dataIndexArr: number[], style: { [name: string]: any }) => void

	/**
	 * depthTest的设定函数，可被子类重写
	 * @node 默认只遍历group内的第一层
	 * @todo It doesn't work as excepted in 3d space
	 * @deprecated
	 */
	protected onDepthTestChange(depthTest: boolean) {
		console.log('StandardLayer: depthTest change, will rebuild material')
		this.group.children.forEach((mesh) => {
			if (isRenderable(mesh)) {
				//
				mesh.material.extensions || (mesh.material.extensions = {})
				mesh.material.extensions.EXT_matr_advanced ||
					(mesh.material.extensions.EXT_matr_advanced = {})

				mesh.material.extensions.EXT_matr_advanced.depthTest =
					depthTest ?? mesh.material.extensions.EXT_matr_advanced.depthTest

				mesh.material.version++
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

	setProps: (props: Partial<TProps | StandardLayerProps>) => void

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

	override updateAlignmentMatrix(matrix: number[]) {
		const old = this.view.gsi.alignmentWrapper.transform.matrix as number[]
		if (!isEqualArray(old, matrix)) {
			copyArray(matrix, old)
			this.view.gsi.alignmentWrapper.transform.version++
		}
	}

	override dispose(): void {}

	raycast(polaris: AbstractPolaris, canvasCoord: CoordV2, ndc: CoordV2): PickInfo | undefined {
		// Leave the method to be implemented by subclass
		return
	}
}

/**
 * @deprecated renamed as {@link StandardLayer}
 */
export const STDLayer = StandardLayer

function isEqualArray(a: number[], b: number[]) {
	if (a === b) return true

	if (a.length !== b.length) return false

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}

	return true
}

function copyArray(source: number[], target: number[]) {
	for (let i = 0; i < source.length; i++) {
		target[i] = source[i]
	}
}
