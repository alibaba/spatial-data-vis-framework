/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * layer view 的逻辑 需要复用，
 * 但是 typescript 中 mixin 和 decoration 都会造成一定程度的 interface 混乱
 * 因此在这里把constructor里增加的逻辑拆成函数，
 */
import { View, Layer } from '@polaris.gl/schema'
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
	readonly groupWrapper = new Mesh({ name: `LAYER-WRAPPER-INNER-USE-ONLY` })

	constructor(layer: Layer) {
		super()
		this.groupWrapper.add(this.group)
		this.init(layer)
	}

	/**
	 * 初始化函数，用来向layer上挂事件
	 * @param layer
	 */
	init(layer: Layer) {
		/**
		 * 根据自身可视状态决定具体视觉元素的显示隐藏
		 */
		layer.onVisibilityChange = () => {
			this.group && (this.group.visible = layer.visible)
		}

		/**
		 * 将具体的视觉元素加入到树中
		 */
		layer.onAdd = (parent: Layer) => {
			const parentView = parent.view.gsi
			if (parentView && GSIView.check(parentView)) {
				parentView.group.add(this.groupWrapper)
			} else {
				/**
				 * @todo 非连续view节点
				 */
				throw new Error('暂未实现非连续view节点，无法把 GsiViewLayer 挂在无 GsiView 的 Layer 上')
			}
		}

		/**
		 * 将具体的视觉元素从树中删除
		 */
		layer.onRemove = (parent: Layer) => {
			const parentView = parent.view.gsi
			if (GSIView.check(parentView)) {
				parentView.group.remove(this.groupWrapper)
			} else {
				/**
				 * @todo 非连续view节点
				 */
				throw new Error('暂未实现非连续view节点，无法把 GsiViewLayer 挂在无 GsiView 的 Layer 上')
			}
		}

		/**
		 * @todo react to viewchange
		 */
	}

	static check(view): view is GSIView {
		return view && view['isGSIView']
	}
}
