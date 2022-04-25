import Pass from '../Pass'
import fs from './glsl/bilateral_fs.glsl'
import vs from './glsl/bilateral_vs.glsl'

const defaultConf = {
	normalBuffer: null,
	depthBuffer: null,
	input: null,
}

export default class BilateralFilterPass extends Pass {
	constructor(conf, THREE) {
		conf = {
			...defaultConf,
			...conf,
		}

		super(conf, THREE)

		this.renderCamera = conf.renderCamera

		this.filterXTarget = new THREE.WebGLRenderTarget(this.width, this.height, {
			depthBuffer: false,
		})

		this.uniforms = {
			normalBuffer: { value: conf.normalBuffer },
			depthBuffer: { value: conf.depthBuffer },
			tex: { value: conf.input },

			cameraNear: { value: 0 },
			cameraFar: { value: 0 },

			blurSize: { value: 1 },

			resolution: { value: new THREE.Vector2(this.width, this.height) },
			// 5次和7次取样的区别
			// gaussianKernel: {value: [0.02, 0.136, 0.228, 0.272, 0.228, 0.136, 0.02]},
			gaussianKernel: { value: [0.08, 0.2, 0.272, 0.2, 0.08] },
		}

		this.filterX = new THREE.ShaderMaterial({
			vertexShader: vs,
			fragmentShader: fs,
			uniforms: this.uniforms,
			name: 'GL2::BilateralFilterPass::Hor',
			defines: {
				DIRECTION_X: true,
			},
		})
		this.filterY = new THREE.ShaderMaterial({
			vertexShader: vs,
			fragmentShader: fs,
			uniforms: this.uniforms,
			name: 'GL2::BilateralFilterPass::Ver',
			defines: {
				DIRECTION_Y: true,
			},
		})
	}

	resize(width, height) {
		super.resize(width, height)
		this.filterXTarget.setSize(width, height)
		this.uniforms.resolution.value.set(width, height)
	}

	render(renderer) {
		this.uniforms.cameraNear.value = this.renderCamera.near
		this.uniforms.cameraFar.value = this.renderCamera.far

		// horizon
		this.canvasMesh.mesh.material = this.filterX
		this.uniforms.tex.value = this.input.texture
		renderer.render(this.scene, this.camera, this.filterXTarget)

		// vertical
		this.canvasMesh.mesh.material = this.filterY
		this.uniforms.tex.value = this.filterXTarget.texture

		renderer.render(this.scene, this.camera, this.output)
	}

	dispose() {
		super.dispose()
		this.filterX.dispose()
		this.filterY.dispose()
	}
}
