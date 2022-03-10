/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { PointMaterial } from '@gs.i/frontend-sdk'
import { Color } from '@gs.i/utils-math'
import { specifyTexture } from '@gs.i/utils-specify'

export const defaultProps = {}

export class ScatterMatr extends PointMaterial {
	props: any

	size = 1
	sizeAttenuation = true
	opacity = 1.0

	constructor(props = {}) {
		super()
		this.setProps(props)

		// @note these are setters. setters can not use class property syntax
		this.defines = {
			// USE_COLORS: false,
			// COLOR_STEPS: 0,
		}
		this.uniforms = {
			time: { value: 0 },
			color: { value: { r: 1.0, g: 1.0, b: 1.0 } },
			// colors: {
			// 	value: [],
			// 	type: 'vec3',
			// },
			// thresholds: {
			// 	value: [],
			// 	type: 'float',
			// },
			colNumber: { value: 1.0 },
			rowNumber: { value: 1.0 },
			TEX: {
				value: specifyTexture({
					image: { uri: 'https://img.alicdn.com/tfs/TB1X4pmgAyWBuNjy0FpXXassXXa-64-64.png' },
				}),
			},
		}

		this.global = `
			uniform float time;
			uniform float colNumber;
			uniform float rowNumber;
			uniform vec3 color;
			uniform sampler2D TEX;
			uniform float thresholds[COLOR_STEPS];
			uniform vec3 colors[COLOR_STEPS];
	
			varying vec2 vColRow;
			varying vec3 vColor;
		`

		this.vertGlobal = `
			attribute vec2 colrow;
			attribute float ratio;
			attribute float delay;
		`

		this.vertPointGeometry = `
			float shiningScale = sin(time + delay) * 0.5 + 0.8;
			pointSize *= size * ratio * shiningScale * 10000000.0;
		`
		this.vertOutput = `
			vColRow = colrow;
			vColor = color;
			#ifdef USE_COLORS
				for (int i = 0; i < COLOR_STEPS; i++ ) {
					if ( ratio >= thresholds[i] ) {
						vColor = colors[i];
					}
				}
			#endif
		`
		this.fragOutput = `
			vec2 uv = gl_PointCoord;
			vec4 tColor = texture2D(TEX, vec2((uv.x + vColRow.x) / colNumber, (uv.y + vColRow.y) / rowNumber));
			fragColor = tColor * vec4(vColor, opacity);
		`
	}

	setProps(props) {
		const _props = {
			...defaultProps,
			...props,
		}
		this.props = _props

		this.size = this.getProps('size') / 1000
		this.sizeAttenuation = this.getProps('sizeAttenuation')
		this.opacity = this.getProps('opacity')
		this.depthTest = this.getProps('depthTest') ?? true
		if (this.getProps('opacity') < 1.0) {
			if (this.getProps('enableBlending')) {
				this.alphaMode = 'BLEND_ADD'
			} else {
				this.alphaMode = 'BLEND'
			}
		} else {
			this.alphaMode = 'OPAQUE'
		}

		let colors, thresholds
		if (this.getProps('useColors')) {
			const arr = this.getProps('colors')
			if (arr.length === 0) {
				console.error("ScatterMatr - Invalid prop 'colors' length")
				return
			}
			// Sort by value
			arr.sort((a, b) => a.value - b.value)
			colors = arr.map((a) => new Color(a.color))
			thresholds = arr.map((a) => a.value)
		}
		this.uniforms.color = { value: new Color(this.getProps('color')) }
		this.uniforms.colNumber = { value: this.getProps('colNumber') }
		this.uniforms.rowNumber = { value: this.getProps('rowNumber') }
		this.uniforms.TEX = {
			value: specifyTexture({
				image: { uri: this.getProps('map') },
				sampler: {
					minFilter: 'LINEAR_MIPMAP_NEAREST',
					anisotropy: 8,
				},
			}),
		}

		if (this.getProps('useColors') && this.getProps('colors').length > 0) {
			this.defines = {
				USE_COLORS: !!this.getProps('useColors'),
				COLOR_STEPS: this.getProps('useColors') ? this.getProps('colors').length : 0,
			}
			this.uniforms['colors'] = {
				value: this.getProps('useColors') ? colors : [],
			}
			this.uniforms['thresholds'] = {
				value: this.getProps('useColors') ? thresholds : [],
			}
		}
	}

	getProps(name) {
		return this.props[name]
	}
}
