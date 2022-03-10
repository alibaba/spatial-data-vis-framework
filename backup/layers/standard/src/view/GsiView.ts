/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * layer view 的逻辑 需要复用，
 * 但是 typescript 中 mixin 和 decoration 都会造成一定程度的 interface 混乱
 * 因此在这里把constructor里增加的逻辑拆成函数，
 */
import { View } from './View'
import type { StandardLayer } from '../StandardLayer'
import { Mesh } from '@gs.i/frontend-sdk'
import type * as IR from '@gs.i/schema-scene'

export class GSIView extends View {
	/**
	 * type guard
	 */
	readonly isGSIView = true

	/**
	 * 用户可以直接操作的 group
	 */
	readonly group = new Mesh()

	/**
	 * 系统进行坐标偏移操作的 group
	 * @note 用户不应该直接操作
	 */
	readonly alignmentWrapper: IR.BaseNode = {
		name: 'LAYER-WRAPPER-INNER-USE-ONLY',
		visible: true,
		transform: {
			matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], // identity matrix
			version: 0,
		} as IR.Transform3Matrix,
		children: new Set(),
	}

	constructor() {
		super()
		// @todo @simon should add group into wrapper after alignment ready
		this.alignmentWrapper.children.add(this.group)
		// @qianxun: will be called in Layer initialization
		// super.init(layer)
	}

	init(layer: StandardLayer<any>): this {
		/**
		 * 根据自身可视状态决定具体视觉元素的显示隐藏
		 */
		layer.onVisibilityChange = (v) => {
			this.onVisibilityChange(v)
		}

		/**
		 * 将具体的视觉元素加入到树中
		 */
		layer.onAdd = (parent) => {
			this.onAdd(parent as any)
		}

		/**
		 * 将具体的视觉元素从树中删除
		 */
		layer.onRemove = (parent) => {
			this.onRemove(parent)
		}

		/**
		 * @todo react to viewchange
		 */

		return this
	}

	/**
	 * Implement
	 */
	onVisibilityChange(visible: boolean) {
		this.group && (this.group.visible = visible)
	}

	/**
	 * Implement
	 */
	onAdd(parent: StandardLayer<any>) {
		const parentView = parent.view.gsi
		if (!parentView) {
			throw new Error('Polaris::GSIView - Parent layer has no GSIView')
		}
		if (GSIView.check(parentView)) {
			parentView.alignmentWrapper.children.add(this.alignmentWrapper)
		} else {
			throw new Error('Polaris::GSIView - Cannot append to a different parent view type')
		}
	}

	/**
	 * Implement
	 */
	onRemove(parent: StandardLayer) {
		const parentView = parent.view.gsi
		if (!parentView) {
			return
		}
		if (GSIView.check(parentView)) {
			parentView.alignmentWrapper.children.delete(this.alignmentWrapper)
		}
	}

	static check(view): view is GSIView {
		return view && view.isGSIView
	}
}
