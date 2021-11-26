/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Pass, CopyMaterial } from 'postprocessing'
import { THREE } from 'gl2'

export class ReadPass extends Pass {
	inputBuffer: any
	readDepth: boolean;

	// TODO fix me
	[key: string]: any

	constructor(inputBuffer, readDepth = true) {
		super('ReadPass')
		this.setFullscreenMaterial(new CopyMaterial())
		this.quad.geometry = new THREE.PlaneBufferGeometry(2, 2)
		this.inputBuffer = inputBuffer
		this.readDepth = readDepth
		this.needsSwap = true
	}

	render(renderer, inputBuffer, outputBuffer, delta, stencilTest) {
		this.getFullscreenMaterial().uniforms.tDiffuse.value = this.inputBuffer.texture
		// this.getFullscreenMaterial().uniforms.tDepth.value = this.inputBuffer.depthTexture
		if (outputBuffer) {
			renderer.render(this.scene, this.camera, this.renderToScreen ? null : outputBuffer)
			if (this.readDepth) {
				outputBuffer.depthTexture = this.inputBuffer.depthTexture
			}
		}
	}
}
