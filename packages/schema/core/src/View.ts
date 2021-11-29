/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Base } from './Base'

export abstract class View {
	readonly isView = true

	constructor() {}

	/**
	 * 初始化视图逻辑,
	 * 将被 Layer 的 constructor 调用,
	 * 可以设置 layer.onAdd onVisibilityChange onRemove 等 event.
	 */
	abstract init(layer: Base): void
	// init: (layer: Layer) => void
}
