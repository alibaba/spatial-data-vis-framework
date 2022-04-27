import vs from './canvasMesh_vs.glsl'
import fs from './canvasMesh_fs.glsl'

import { PlaneBufferGeometry, RawShaderMaterial, Mesh } from 'three'

export default class CanvasMesh {
	constructor(props = {}) {
		const { renderTarget, customVs, customFs, uniforms, defines = {} } = props
		this.geometry = new PlaneBufferGeometry(2, 2)

		this.material =
			props.material ||
			new RawShaderMaterial({
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
		this.mesh = new Mesh(this.geometry, this.material)
	}
}
