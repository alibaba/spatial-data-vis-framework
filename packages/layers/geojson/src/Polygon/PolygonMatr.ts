/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { MatrPbr } from '@gs.i/frontend-sdk'

export class PolygonMatr extends MatrPbr {
	metallicFactor = 0.1
	roughnessFactor = 1.0
	opacity = 1
	uniforms = {
		uHeightScale: { value: 1, type: 'float' },
	}
	attributes = {
		color: 'vec4',
	}
	varyings = {
		vColor: 'vec4',
	}
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
		const uniforms = this.uniforms
		uniforms.uHeightScale.value = props.heightScale ?? uniforms.uHeightScale.value
	}
}
