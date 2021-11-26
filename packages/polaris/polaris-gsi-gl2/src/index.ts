/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

// 前端 GSI
import { PolarisGSI } from '@polaris.gl/gsi'
// 后端 GSI-GL2
import { GSIGL2Renderer } from '@polaris.gl/renderer-gsi-gl2'
import { PolarisProps } from '@polaris.gl/schema'
// export * as Animation from '@polaris.gl/utils-animation'

export interface PolarisGSIGL2Props extends PolarisProps {}

export interface PolarisGSIGL2 extends PolarisGSI {}
export class PolarisGSIGL2 extends PolarisGSI {
	readonly renderer: GSIGL2Renderer

	constructor(props: PolarisGSIGL2Props) {
		super(props)
		this.name = 'PolarisGSIGL2'
		const renderer = new GSIGL2Renderer(this.props)
		this.setRenderer(renderer)
	}
}
