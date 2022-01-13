/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

// 前端 GSI
import { PolarisGSI } from '@polaris.gl/gsi'
// 后端 GSI-GL2
import { LiteRenderer } from '@polaris.gl/renderer-lite'
import { PolarisProps } from '@polaris.gl/base'

export interface PolarisLiteProps extends PolarisProps {}

export interface PolarisLite extends PolarisGSI {}
export class PolarisLite extends PolarisGSI {
	readonly renderer: LiteRenderer

	constructor(props: PolarisLiteProps) {
		super(props)
		this.name = 'PolarisLite'
		const renderer = new LiteRenderer(this.props)
		this.setRenderer(renderer)
	}
}
