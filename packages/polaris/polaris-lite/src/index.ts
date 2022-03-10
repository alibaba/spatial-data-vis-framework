/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

// 前端 GSI
import { PolarisGSI } from '@polaris.gl/gsi'
// 后端 GSI-GL2
import { LiteRenderer } from './renderer/LiteRenderer'
import type { PolarisProps } from '@polaris.gl/base'

export interface PolarisLiteProps extends PolarisProps {}

export interface PolarisLite extends PolarisGSI {}
export class PolarisLite extends PolarisGSI {
	readonly renderer: LiteRenderer

	constructor(props: PolarisLiteProps) {
		super(props)
		this.renderer = new LiteRenderer(this.props)

		this.cameraProxy.config.onUpdate = (cam) => this.renderer.updateCamera(cam)
		this.cameraProxy['onUpdate'] = (cam) => this.renderer.updateCamera(cam)
		// 这里立刻update
		this.renderer.updateCamera(this.cameraProxy)
		this.renderer.resize(this.width, this.height, this.ratio)
		this.view.html.element.appendChild(this.renderer.canvas)
	}
}
