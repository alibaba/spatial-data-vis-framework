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

const _DIV = document.createElement('DIV')

export class HtmlView extends View {
	constructor(layer: Layer) {
		super()
		this.init(layer)
	}
	/**
	 * 渲染内容
	 * @note 按需创建，可能根本用不到
	 * @todo onAdd 回调中的检测会导致这里失效
	 */
	private _element: HTMLElement
	public get element(): HTMLElement {
		if (!this._element) this._element = _DIV.cloneNode(false) as HTMLElement
		return this._element
	}

	/**
	 * type guard
	 */
	isHtmlView = true

	/**
	 * 语法糖 @todo controversal
	 */
	html = this

	/**
	 * 初始化函数，用来向layer上挂事件
	 * @param layer
	 */
	init(layer: Layer) {
		/**
		 * 根据自身可视状态决定具体视觉元素的显示隐藏
		 */
		layer.onVisibilityChange = () => {
			// 继承父节点visibility
			this.element && (this.element.style.visibility = layer.visible ? 'inherit' : 'hidden')
		}

		/**
		 * 将具体的视觉元素加入到树中
		 */
		layer.onAdd = (parent: Layer) => {
			const parentView = parent.view.html
			if (HtmlView.check(parentView)) {
				parentView.element.appendChild(this.element)
			} else {
				/**
				 * @todo 非连续view节点
				 */
				throw new Error('暂未实现非连续view节点，无法把 htmlViewLayer 挂在无 htmlView 的 Layer 上')
			}
		}

		/**
		 * 将具体的视觉元素从树中删除
		 */
		layer.onRemove = (parent: Layer) => {
			const parentView = parent.view.html
			if (HtmlView.check(parentView)) {
				parentView.element.removeChild(this.element)
			} else {
				/**
				 * @todo 非连续view节点
				 */
				throw new Error('暂未实现非连续view节点，无法把 htmlViewLayer 挂在无 htmlView 的 Layer 上')
			}
		}

		/**
		 * @todo react to viewchange
		 */
	}

	static check(view): view is HtmlView {
		return view && view['isHtmlView']
	}
}
