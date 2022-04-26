import vs from './canvasMesh_vs.glsl?raw'
import fs from './canvasMesh_fs.glsl?raw'

export default class CanvasMesh {
	constructor(props = {}, THREE) {
		const { renderTarget, customVs, customFs, uniforms, defines = {} } = props
		// @TODO 去THREE化？
		this.geometry = new THREE.PlaneBufferGeometry(2, 2)

		this.material =
			props.material ||
			new THREE.RawShaderMaterial({
				vertexShader: customVs || vs,
				fragmentShader: customFs || fs,
				uniforms: {
					tex: { value: renderTarget },
					...uniforms,
				},
				defines,
				depthTest: true,
				depthWrite: true,
				// transparent: true,
			})

		this.material.name = props.name || props.type || (props.material || {}).name
		this.mesh = new THREE.Mesh(this.geometry, this.material)
	}
}
