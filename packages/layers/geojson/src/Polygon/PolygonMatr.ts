/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { PbrMaterial } from '@gs.i/frontend-sdk'

export class PolygonMatr extends PbrMaterial {
	metallicFactor = 0.1
	roughnessFactor = 1.0
	opacity = 1
	uniforms = {
		uHeightScale: { value: 1 },
	}
	global = `
		uniform float uHeightScale;
		varying vec4 vColor;
	`
	vertGlobal? = `
		attribute vec4 color;
	`
	vertGeometry = `
        position = vec3(position.x, position.y, position.z * uHeightScale);
    `
	vertOutput = `
        vColor = color / vec4(255.0);
    `
	fragGeometry = `
		vec3 fdx = vec3( dFdx( modelViewPosition.x ), dFdx( modelViewPosition.y ), dFdx( modelViewPosition.z ) );
		vec3 fdy = vec3( dFdy( modelViewPosition.x ), dFdy( modelViewPosition.y ), dFdy( modelViewPosition.z ) );
		normal = normalize( cross( fdx, fdy ) );
	`
	preLighting = `
		diffuse = vec4(vColor.rgb, vColor.a * opacity);
        emissive = vec3(vColor.rgb);
    `
	alphaMode = 'OPAQUE' as const

	constructor(props = {}) {
		super()
		this.setProps(props)
	}

	setProps(props) {
		// this is a setter. do not get uniforms from proxy
		// const uniforms = this.uniforms
		const uniforms = this.extensions.EXT_matr_programmable.uniforms as PolygonMatr['uniforms']
		uniforms.uHeightScale.value = props.heightScale ?? uniforms.uHeightScale.value
	}
}
