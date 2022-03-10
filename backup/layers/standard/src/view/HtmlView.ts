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

const _DIV = document.createElement('DIV')

export class HtmlView extends View {
	/**
	 * 渲染内容
	 * @note 按需创建，可能根本用不到
	 * @todo onAdd 回调中的检测会导致这里失效
	 */
	private _element: HTMLDivElement

	public get element(): HTMLDivElement {
		if (!this._element) this._element = _DIV.cloneNode(false) as HTMLDivElement
		return this._element
	}

	/**
	 * type guard
	 */
	readonly isHtmlView = true

	constructor() {
		super()
		// @qianxun: will be called in Layer initialization
		// super.init(layer)
	}

	init(layer: StandardLayer<any>): this {
		/**
		 * 根据自身可视状态决定具体视觉元素的显示隐藏
		 */
		layer.onVisibilityChange = (visible) => {
			this.onVisibilityChange(visible)
		}

		/**
		 * 将具体的视觉元素加入到树中
		 */
		layer.onAdd = (parent: StandardLayer) => {
			this.onAdd(parent)
		}

		/**
		 * 将具体的视觉元素从树中删除
		 */
		layer.onRemove = (parent: StandardLayer) => {
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
	onVisibilityChange(visible) {
		// 继承父节点visibility: `inherit`
		this.element && (this.element.style.visibility = visible ? 'inherit' : 'hidden')
	}

	/**
	 * Implement
	 */
	onAdd(parent: StandardLayer<any>) {
		const parentView = parent.view.html
		if (!parentView) {
			throw new Error('Polaris::HtmlView - Parent layer has no HtmlView')
		}
		parentView.element.appendChild(this.element)
	}

	/**
	 * Implement
	 */
	onRemove(parent: StandardLayer<any>) {
		const parentView = parent.view.html
		if (!parentView) {
			return
		}
		// Robust improvement
		if (this.element.parentNode === parentView.element) {
			parentView.element.removeChild(this.element)
		} else {
			console.warn('html view: onRemove: parentNode is not parent view')
		}
	}
}
