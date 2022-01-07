/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Pass } from 'postprocessing'
import { THREE } from 'gl2'

/**
 * Swap the depthTexture from outputBuffer to inputBuffer.
 * Normally used for cases that next pass needs depth input.
 *
 * @export
 * @class DepthCopyPass
 * @extends {Pass}
 */
export class DepthSwapPass extends Pass {
	inputBuffer: any
	outputBuffer: any

	constructor(inputBuffer, outputBuffer, readDepth = true) {
		super('ReadPass')
		this.inputBuffer = inputBuffer
		this.outputBuffer = outputBuffer
	}

	render(renderer, inputBuffer, outputBuffer, delta, stencilTest) {
		if (this.inputBuffer && this.outputBuffer) {
			const tmp = this.outputBuffer.depthTexture
			this.outputBuffer.depthTexture = this.inputBuffer.depthTexture
			this.inputBuffer.depthTexture = tmp
		}
	}
}
