/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { PbrMaterial } from '@gs.i/frontend-sdk'

export class PolygonMatr extends PbrMaterial {
	metallicFactor = 0.1
	roughnessFactor = 1.0
	opacity = 1
	alphaMode = 'OPAQUE' as const

	constructor(props = {}) {
		super()
		// @note these are setters. setters can not use class property syntax
		this.uniforms = {
			uHeightScale: { value: 1 },
		}
		this.global = `
			uniform float uHeightScale;
			varying vec4 vColor;
		`
		this.vertGlobal = `
			attribute vec4 color;
		`
		this.vertGeometry = `
			position = vec3(position.x, position.y, position.z * uHeightScale);
		`
		this.vertOutput = `
			vColor = color / vec4(255.0);
		`
		this.fragGeometry = `
			vec3 fdx = vec3( dFdx( modelViewPosition.x ), dFdx( modelViewPosition.y ), dFdx( modelViewPosition.z ) );
			vec3 fdy = vec3( dFdy( modelViewPosition.x ), dFdy( modelViewPosition.y ), dFdy( modelViewPosition.z ) );
			normal = normalize( cross( fdx, fdy ) );
		`
		this.fragPreLighting = `
			diffuse = vec4(vColor.rgb, vColor.a * opacity);
			emissive = vec3(vColor.rgb);
		`
		this.setProps(props)
	}

	setProps(props) {
		this.uniforms.uHeightScale.value = props.heightScale ?? this.uniforms.uHeightScale.value
	}
}
