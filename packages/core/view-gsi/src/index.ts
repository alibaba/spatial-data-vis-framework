/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * layer view 的逻辑 需要复用，
 * 但是 typescript 中 mixin 和 decoration 都会造成一定程度的 interface 混乱
 * 因此在这里把constructor里增加的逻辑拆成函数，
 */
import { View, Layer } from '@polaris.gl/base'
import { Mesh } from '@gs.i/frontend-sdk'

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
	readonly groupWrapper = new Mesh({ name: 'LAYER-WRAPPER-INNER-USE-ONLY' })

	constructor() {
		super()
		this.groupWrapper.add(this.group)
		// @qianxun: will be called in Layer initialization
		// super.init(layer)
	}

	layer: Layer

	init(layer: Layer): this {
		this.layer = layer

		/**
		 * 根据自身可视状态决定具体视觉元素的显示隐藏
		 */
		layer.onVisibilityChange = () => {
			this.onVisibilityChange()
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
	onVisibilityChange() {
		this.group && (this.group.visible = this.layer.visible)
	}

	/**
	 * Implement
	 */
	onAdd(parent: Layer) {
		const parentView = parent.view.gsi
		if (!parentView) {
			throw new Error('Polaris::GSIView - Parent layer has no GSIView')
		}
		if (GSIView.check(parentView)) {
			parentView.group.add(this.groupWrapper)
		} else {
			throw new Error('Polaris::GSIView - Cannot append to a different parent view type')
		}
	}

	/**
	 * Implement
	 */
	onRemove(parent: Layer) {
		const parentView = parent.view.gsi
		if (!parentView) {
			return
		}
		if (GSIView.check(parentView)) {
			parentView.group.remove(this.groupWrapper)
		}
	}

	static check(view): view is GSIView {
		return view && view['isGSIView']
	}
}
