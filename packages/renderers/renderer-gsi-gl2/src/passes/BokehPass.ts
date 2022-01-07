/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import GL2, { THREE } from 'gl2'
import { Pass } from 'postprocessing'

export class BokehPass extends Pass {
	uniforms: any
	filterX: THREE.ShaderMaterial
	filterY: THREE.ShaderMaterial
	filterXTarget: THREE.WebGLRenderTarget;

	// TODO fix this
	[key: string]: any

	constructor() {
		super('BokehPass')
		this.uniforms = {
			resolution: { value: new THREE.Vector2() },
			tDiffuse: { value: null },
			tDepth: { value: null },

			focus: { value: null },
			dof: { value: null },
			aperture: { value: null },
			maxBlur: { value: 2 },

			cameraNear: { value: null },
			cameraFar: { value: null },

			// gaussianKernel: {value: [0.02, 0.03, 0.06, 0.08, 0.11, 0.14, 0.13, 0.11, 0.08, 0.06, 0.03, 0.02, 0]},
			gaussianKernel: { value: [0.02, 0.06, 0.11, 0.13, 0.08, 0.03] },
		}
		this.filterX = new THREE.ShaderMaterial({
			fragmentShader: GL2.BokehPass.fs,
			vertexShader: GL2.BokehPass.vs,
			uniforms: this.uniforms,
			name: 'Polaris::BokehPass::Hor',
			defines: {
				DIRECTION_X: true,
			},
			depthTest: false,
			depthWrite: false,
		})
		this.filterY = new THREE.ShaderMaterial({
			fragmentShader: GL2.BokehPass.fs,
			vertexShader: GL2.BokehPass.vs,
			uniforms: this.uniforms,
			name: 'Polaris::BokehPass::Ver',
			defines: {
				DIRECTION_Y: true,
			},
			depthTest: false,
			depthWrite: false,
		})

		this.filterXTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false })

		this.setFullscreenMaterial(this.filterX)
		this.quad.geometry = new THREE.PlaneBufferGeometry(2, 2)
	}

	render(renderer, inputBuffer, outputBuffer, delta, stencilTest) {
		// this.uniforms.tDepth.value = inputBuffer.depthTexture

		// horizon
		this.setFullscreenMaterial(this.filterX)
		this.uniforms.tDiffuse.value = inputBuffer.texture
		renderer.render(this.scene, this.camera, this.filterXTarget, true)

		// vertical
		this.setFullscreenMaterial(this.filterY)
		this.uniforms.tDiffuse.value = this.filterXTarget.texture

		renderer.render(this.scene, this.camera, this.renderToScreen ? null : outputBuffer)
	}

	setSize(width, height) {
		this.filterXTarget.setSize(width, height)
		this.uniforms.resolution.value.set(width, height)
	}

	/**
	 * @QianXun
	 */
	setMaterialsProps(props = {}) {
		for (const key in props) {
			if (props[key] !== undefined) {
				this.filterX[key] = props[key]
				this.filterY[key] = props[key]
			}
		}
	}

	dispose() {
		this.filterX.dispose()
		this.filterY.dispose()
		this.filterXTarget.dispose()
	}
}
