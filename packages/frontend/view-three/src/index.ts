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

// 只做为 typescript 的类型判断使用，并没有引用代码，会在编译阶段被shake掉
import { Group } from 'three'
interface GroupLike {
	add
	visible
	remove
}

export class ThreeView<T extends GroupLike = Group> extends View {
	/**
	 * type guard
	 */
	isThreeView = true

	/**
	 * 语法糖 @todo controversal
	 */
	three = this

	// 不去限制用户的 THREE 版本，将 Group 构造函数传入
	private _groupClass: new () => T
	constructor(layer: Layer, groupClass: new () => T) {
		super()
		this._groupClass = groupClass
		this.init(layer)

		this.groupWrapper.add(this.group)
	}

	/**
	 * 渲染内容
	 * @note 按需创建，可能根本用不到
	 * @todo onAdd 回调中的检测会导致这里失效
	 */
	private _group: T
	get group(): T {
		if (!this._group) this._group = new this._groupClass()
		return this._group
	}

	private _groupWrapper: T
	get groupWrapper() {
		if (!this._groupWrapper) this._groupWrapper = new this._groupClass()
		return this._groupWrapper
	}

	init(layer: Layer) {
		/**
		 * 根据自身可视状态决定具体视觉元素的显示隐藏
		 */
		layer.onVisibilityChange = () => {
			this.group && (this.group.visible = true)
		}

		/**
		 * 将具体的视觉元素加入到树中
		 */
		layer.onAdd = (parent: Layer) => {
			const parentView = parent.view.three
			if (this.check(parentView)) {
				parentView.group.add(this.groupWrapper)
			} else {
				/**
				 * @todo 非连续view节点
				 */
				throw new Error(
					'暂未实现非连续view节点，无法把 threeViewLayer 挂在无 threeView 的 Layer 上'
				)
			}
		}

		/**
		 * 将具体的视觉元素从树中删除
		 */
		layer.onRemove = (parent: Layer) => {
			const parentView = parent.view.three
			if (this.check(parentView)) {
				parentView.group.remove(this.groupWrapper)
			} else {
				/**
				 * @todo 非连续view节点
				 */
				throw new Error(
					'暂未实现非连续view节点，无法把 threeViewLayer 挂在无 threeView 的 Layer 上'
				)
			}
		}

		/**
		 * @todo react to viewchange
		 */
	}

	check(view): view is ThreeView<T> {
		return view && view['isThreeView']
	}
}
