import Pass from '../Pass'
import fs from './glsl/fxaa_fs.glsl?raw'
import vs from './glsl/fxaa_vs.glsl?raw'

/**
 * The Kawase blur kernel presets.
 *
 * @type {Float32Array[]}
 * @private
 */

const defaultConf = {
	width: 1200,
	height: 800,
}

export default class FXAAPass extends Pass {
	constructor(conf, THREE) {
		conf.uniforms = {
			tex: {},
			resolution: { value: new THREE.Vector2(conf.width, conf.height) },
		}
		conf.vs = vs
		conf.fs = fs
		super(conf, THREE)
	}

	resize(width, height) {
		this.width = width
		this.height = height
		this.uniforms.resolution.value.set(width, height)
	}
}
