import Pass from './Pass'

export default class Pipeline {
	constructor(conf = {}) {
		this.renderer = conf.renderer
		this.passes = []
		// this.renderTargets = [];

		this.isPipeline = true
	}

	/**
	 * 添加一个Pass
	 * @param {Object|GL2.Pass} pass
	 * @return {this}
	 */
	addPass(pass) {
		if (pass.isPass) {
			if (this.passes.length === 0) {
				this.passes.push(pass)
				return this
			}
			const lastPass = this.passes[this.passes.length - 1]
			// 当前pass加入pipeline处理队列
			this.passes.push(pass)
			// 为上一个pass设置renderTarget，并作为当前pass的输入
			// // @TODO: 能否放在pass中实现
			// const renderTarget = new RenderTarget({
			// 	width: pass.width,
			// 	height: pass.height,
			// });
			// lastPass.setOutput(renderTarget);
			// // this.renderTargets.push(renderTarget);
			// pass.setInput(renderTarget)
			lastPass.pipeTo(pass)
			return this
		} else {
			return this.addPass(this.makePass(pass))
		}
	}

	/**
	 * 根据用户自定义配置，创建一个Pass对象
	 * @param  {Object} props
	 * @return {this}
	 */
	makePass(props) {
		return new Pass(props)
	}

	/**
	 * 渲染一帧
	 * @param  {GL2.Renderer} [renderer(optional)] 覆盖内置this.renderer
	 */
	render(_renderer, _renderTarget) {
		const renderer = _renderer || this.renderer
		if (!renderer) {
			throw new Error('无可用渲染器Renderer')
		}

		this.passes.forEach((pass) => {
			pass.onBefore && pass.onBefore()
			// 如果是最后一个pass，renderTarget为undefined，将会画在DrawBuffer上输出
			pass.render(renderer)
			// renderer.render(pass.scene, pass.camera, pass.renderTarget);
			pass.onAfter && pass.onAfter()
		})
	}

	dispose() {
		this.passes.forEach((pass) => {
			pass.dispose()
		})
	}
}
