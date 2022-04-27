import Pass from '../Pass'
import fs from './glsl/bokeh_fs.glsl'
import vs from './glsl/bokeh_vs.glsl'
import CanvasMesh from '../CanvasMesh'

const defaultConf = {
	normalBuffer: null,
	depthBuffer: null,
	input: null,

	// constantPixelStride: 5,
	// pixelStrideZCutoff: 200,
	// maxRayDistance: 500,
	// cb_zThickness: 0.5,
	// MAX_ITERATION: 40,
	// MAX_BINARY_SEARCH_ITERATION: 20,
	// eyeFadeStart: 0.9,
	// eyeFadeEnd: 0.8,
	focus: 1.0,
	dof: 0.02,
	aperture: 0.025,
	maxBlur: 1.0,
}

export default class BokehPass extends Pass {
	static get fs() {
		return fs
	}
	static get vs() {
		return vs
	}
	constructor(conf, THREE) {
		conf = {
			...defaultConf,
			...conf,
		}
		super(conf, THREE)

		this.conf = conf

		// this.Matrix4 = THREE.Matrix4;

		// const texelSize = new THREE.Vector2(1 / this.width, 1 / this.height);
		// const halfTexelSize = texelSize.clone().multiplyScalar(0.5);

		this.renderCamera = conf.renderCamera

		this.aoTarget = new THREE.WebGLRenderTarget(this.width, this.height)

		this.aoScene = new THREE.Scene()
		this.uniforms = {
			// texelSize: { value: texelSize },
			// halfTexelSize: { value: halfTexelSize },
			tex: { value: conf.input },
			normalBuffer: { value: conf.normalBuffer },
			depthBuffer: { value: conf.depthBuffer },

			renderBufferSize: { value: new THREE.Vector2() },
			// oneDividedByRenderBufferSize: { value: new THREE.Vector2() },

			cameraNear: { value: 0.1 },
			cameraFar: { value: 0 },
			aspect: { value: 1 },

			focus: { value: conf.focus },
			dof: { value: conf.dof },
			aperture: { value: conf.aperture },
			maxBlur: { value: conf.maxBlur },
		}
		this.defines = {
			// MAX_ITERATION: conf.MAX_ITERATION,
			// MAX_BINARY_SEARCH_ITERATION: conf.MAX_BINARY_SEARCH_ITERATION,
		}

		this.aoMesh = new CanvasMesh(
			{
				material: new THREE.ShaderMaterial({
					vertexShader: vs,
					fragmentShader: fs,
					uniforms: this.uniforms,
					defines: this.defines,
					name: 'BokehPass',
				}),
			},
			THREE
		)
		this.aoScene.add(this.aoMesh.mesh)
	}

	render(renderer) {
		// this.uniforms.seed.value = Math.random();

		this.uniforms.cameraNear.value = this.renderCamera.near
		this.uniforms.cameraFar.value = this.renderCamera.far
		this.uniforms.renderBufferSize.value.set(this.width, this.height)
		this.uniforms.aspect.value = this.width / this.height
		// this.uniforms.oneDividedByRenderBufferSize.value.set(1 / this.width, 1 / this.height);
		// this.uniforms.cameraProjectionMatrix.value = this.renderCamera.projectionMatrix;
		// this.uniforms.cameraInverseProjectionMatrix.value.getInverse(this.renderCamera.projectionMatrix);

		// var T = new this.Matrix4().makeTranslation(0.5, 0.5, 0);
		// var S = new this.Matrix4().makeScale(0.5, 0.5, 1.0);
		// var screenScale = new this.Matrix4().makeScale(this.width, this.height, 1.0);
		// var projToPixel = this.uniforms.projectToPixelMatrix.value;
		// T.multiply(S);
		// // ? camera
		// screenScale.multiply(T).multiply(this.camera.projectionMatrix);
		// projToPixel.copy(screenScale);

		// debugger
		renderer.render(this.aoScene, this.camera, this.output)
	}

	dispose() {
		super.dispose()
		this.aoTarget.dispose()
		this.aoScene.material.dispose()
		this.aoScene.geometry.dispose()
	}
}
