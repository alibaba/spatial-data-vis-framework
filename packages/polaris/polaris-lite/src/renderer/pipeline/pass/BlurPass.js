import Pass from '../Pass'
import fs from './glsl/blur_fs.glsl'
import vs from './glsl/blur_vs.glsl'
import CanvasMesh from '../CanvasMesh'

/**
 * The Kawase blur kernel presets.
 *
 * @type {Float32Array[]}
 * @private
 */

const kernelPresets = [
	[0.0, 0.0],
	[0.0, 1.0, 1.0],
	[0.0, 1.0, 1.0, 2.0],
	[0.0, 1.0, 2.0, 2.0, 3.0],
	[0.0, 1.0, 2.0, 3.0, 4.0, 4.0, 5.0],
	[0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 7.0, 8.0, 9.0, 10.0],
]

const defaultConf = {
	width: 1200,
	height: 800,
	kernel: 3,
}

export default class BlurPass extends Pass {
	constructor(conf, THREE) {
		super(conf, THREE)

		this.kernel = conf.kernel === undefined ? defaultConf.kernel : conf.kernel

		this.kernels = kernelPresets[this.kernel]

		this.proTargetX = new THREE.WebGLRenderTarget(this.width / 2, this.height / 2)

		this.proTargetY = new THREE.WebGLRenderTarget(this.width / 2, this.height / 2)

		this.texelSize = new THREE.Vector2(1 / this.width, 1 / this.height)
		this.halfTexelSize = this.texelSize.clone().multiplyScalar(0.5)

		this.kernelScene = new THREE.Scene()
		this.kernelMesh = new CanvasMesh(
			{
				customVs: vs,
				customFs: fs,
				uniforms: {
					texelSize: { value: this.texelSize },
					halfTexelSize: { value: this.halfTexelSize },
					kernel: { value: 0 },
					tex: {},
				},
			},
			THREE
		)
		this.kernelScene.add(this.kernelMesh.mesh)
	}

	render(renderer) {
		// 收到原始图像的尺寸应该是完整的（this.width等于原始width）

		// 首先拷贝到一个一半分辨率target上，进行接下来的处理
		// 这里的Scene里面只包含普通CanvasMesh
		renderer.render(this.scene, this.camera, this.proTargetX)

		let readTarget = this.proTargetX
		let writeTarget = this.proTargetY

		// kernel 卷积
		this.kernels.forEach((kernel, index) => {
			this.kernelMesh.material.uniforms.kernel.value = kernel
			this.kernelMesh.material.uniforms.tex.value = readTarget.texture

			if (index === this.kernels.length - 1) {
				renderer.render(this.kernelScene, this.camera, this.output)
				return
			}

			renderer.render(this.kernelScene, this.camera, writeTarget)

			const tmp = writeTarget
			writeTarget = readTarget
			readTarget = tmp
		})

		// 最后的writeTarget中保存着最新的卷积结果
		// renderer.render(this.scene, this.camera, this.renderTarget);
	}

	resize(width, height) {
		this.width = width
		this.height = height

		this.texelSize.set(1 / this.width, 1 / this.height)
		this.halfTexelSize.copy(this.texelSize).multiplyScalar(0.5)

		this.proTargetX.setSize(this.width / 2, this.height / 2)
		this.proTargetY.setSize(this.width / 2, this.height / 2)
	}

	dispose() {
		super.dispose()
		this.proTargetX.dispose()
		this.proTargetY.dispose()
		this.kernelMesh.material.dispose()
		this.kernelMesh.geometry.dispose()
	}
}
