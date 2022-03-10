/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import type { AbstractLayer } from './Layer'

/**
 * @note kind of over-design. class name and interface may change into future.
 * @note this is for framework developers to add third-party renderers.
 * 		 should not be exposed to client developers.
 */
export abstract class View {
	readonly isView = true

	constructor() {}

	/**
	 * 初始化视图逻辑,
	 * 将被 Layer 的 constructor 调用,
	 * 可以设置 layer.onAdd onVisibilityChange onRemove 等 event.
	 */
	abstract init(layer: AbstractLayer<any>): void
	// init: (layer: Layer) => void
}
