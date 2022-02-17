/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * layer view 的逻辑 需要复用，
 * 但是 typescript 中 mixin 和 decoration 都会造成一定程度的 interface 混乱
 * 因此在这里把constructor里增加的逻辑拆成函数，
 */
import { View, Layer, isLayer } from '@polaris.gl/base'

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
			if (isLayer(parent)) {
				this.onAdd(parent)
			} else {
				console.error('parent of a Layer must be a Layer')
			}
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
		// 继承父节点visibility: `inherit`
		this.element && (this.element.style.visibility = this.layer.visible ? 'inherit' : 'hidden')
	}

	/**
	 * Implement
	 */
	onAdd(parent: Layer) {
		const parentView = parent.view.html
		if (!parentView) {
			throw new Error('Polaris::HtmlView - Parent layer has no HtmlView')
		}
		if (HtmlView.check(parentView)) {
			parentView.element.appendChild(this.element)
		} else {
			/**
			 * @todo 非连续view节点
			 */
			throw new Error('Polaris::HtmlView - Cannot append to a different parent view type')
		}
	}

	/**
	 * Implement
	 */
	onRemove(parent: Layer) {
		const parentView = parent.view.html
		if (!parentView) {
			return
		}
		if (HtmlView.check(parentView)) {
			// Robust improvement
			if (this.element.parentNode === parentView.element) {
				parentView.element.removeChild(this.element)
			}
		}
	}

	static check(view): view is HtmlView {
		return view && view['isHtmlView']
	}
}
