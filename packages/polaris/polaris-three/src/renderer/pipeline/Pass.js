import CanvasMesh from './CanvasMesh'

// @TODO: 拆分Pass和CopyPass
export default class Pass {
	constructor(conf = {}, THREE) {
		this.isPass = true

		this.width = conf.width
		this.height = conf.height
		this.onBefore = conf.onBefore
		this.onAfter = conf.onAfter
		this.output = null // 如果绘制是是undefined，将会绘在drawBuffer上
		this.input = null // 执行pipeTo的时候会得到

		if (conf.scene && conf.camera) {
			this.scene = conf.scene
			this.camera = conf.camera
		} else if (conf.scene || conf.camera) {
			throw new Error('自定义pass需要包含Camera和scene')
		} else {
			this.uniforms = conf.uniforms
			// 对整个画布进行2d后期处理
			this.canvasMesh = new CanvasMesh(
				{
					customVs: conf.vs,
					customFs: conf.fs,
					uniforms: conf.uniforms,
					defines: conf.defines || {},
				},
				THREE
			)

			this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2)
			this.camera.position.z = 1

			this.scene = new THREE.Scene()
			this.scene.add(this.canvasMesh.mesh)
		}

		this.RenderTarget = THREE.WebGLRenderTarget
	}

	resize(width, height) {
		this.width = width
		this.height = height
	}

	setInput(renderTarget) {
		if (!this.canvasMesh) {
			throw new Error('非标准Pass对象，请手工设置输入')
		}
		this.input = renderTarget
		if (this.canvasMesh) {
			this.canvasMesh.material.uniforms.tex.value = renderTarget.texture
		}
	}

	setOutput(renderTarget) {
		this.output = renderTarget
	}

	pipeTo(pass) {
		const renderTarget = new this.RenderTarget(pass.width, pass.height, {
			depth: pass.depth,
		})
		renderTarget.multisample = pass.multisample
		this.setOutput(renderTarget)
		pass.setInput(renderTarget)
	}

	render(renderer) {
		renderer.setRenderTarget(this.output)
		renderer.render(this.scene, this.camera)
	}

	dispose() {
		if (this.canvasMesh) {
			this.canvasMesh.material.dispose()
			this.canvasMesh.geometry.dispose()
		}
	}
}
