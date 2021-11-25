/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * typescript 的 mixin 写法。
 * 之所以写这么麻烦，是会因为 typescript 中：
 * - mixin 无法使用 private 属性
 * - class 装饰器不会反映在类的接口中
 */

// 合并所有 property
export function applyMixins(derivedCtor: any, baseCtors: any[]) {
	baseCtors.forEach((baseCtor) => {
		Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
			const baseCtorName = Object.getOwnPropertyDescriptor(baseCtor.prototype, name)
			// @fixed
			if (!baseCtorName) return
			Object.defineProperty(derivedCtor.prototype, name, baseCtorName)
		})
	})
}

/**

// Type of ViewLayer
interface TVL extends Layer, HtmlLayer, ThreeLayer, RenderableLayer {}

// Type of ViewLayer's constructor
// 必须和 ViewLayer 写成两个 interface，因为 ts 不允许 interface 的 new 字段 返回自身（循环构造）
interface TVLConstructor extends Layer, HtmlLayer, ThreeLayer, RenderableLayer {
	new (
		...params:
			| ConstructorParameters<typeof HtmlLayer>
			| ConstructorParameters<typeof ThreeLayer>
			| ConstructorParameters<typeof RenderableLayer>
	): TVL
}

// View Layer 类，在 constructor 中调用三种 layer 的初始化逻辑
// 模拟多继承
export class VL extends Layer {
	constructor(
		...params:
			| ConstructorParameters<typeof HtmlLayer>
			| ConstructorParameters<typeof ThreeLayer>
			| ConstructorParameters<typeof RenderableLayer>
	) {
		super(...params)

		initHtmlView((this as unknown) as HtmlLayer)
		initThreeView((this as unknown) as ThreeLayer)
		initRenderableView((this as unknown) as RenderableLayer)
	}
}

// 复制所有属性
applyMixins(VL, [HtmlLayer, ThreeLayer, RenderableLayer])

// 强制赋予合并后的类型
export const ViewLayer = (VL as unknown) as TVLConstructor

// 检查类型是否正确
// const a = new ViewLayer({})

*/
