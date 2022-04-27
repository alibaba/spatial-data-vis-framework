/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { ShaderMaterial, Texture, Vector2 } from 'three'
// import * as postprocessing from 'postprocessing'

const R = 6378137 // 常量 - 地球半径

export function genFXAAMaterial(opt) {
	// if (typeof global.THREE === 'undefined') {
	//   throw new TypeError('You must have THREE in global scope for this module.')
	// }
	opt = opt || {}
	return new ShaderMaterial({
		uniforms: {
			tDiffuse: { value: new Texture() },
			resolution: { value: opt.resolution || new Vector2() },
		},
		vertexShader:
			'#define GLSLIFY 1\nvarying vec2 vUv;\n\nvarying vec2 v_rgbNW;\nvarying vec2 v_rgbNE;\nvarying vec2 v_rgbSW;\nvarying vec2 v_rgbSE;\nvarying vec2 v_rgbM;\n\nuniform vec2 resolution;\n\nvoid main() {\n  vUv = uv;\n  vec2 fragCoord = uv * resolution;\n  vec2 inverseVP = 1.0 / resolution.xy;\n  v_rgbNW = (fragCoord + vec2(-1.0, -1.0)) * inverseVP;\n  v_rgbNE = (fragCoord + vec2(1.0, -1.0)) * inverseVP;\n  v_rgbSW = (fragCoord + vec2(-1.0, 1.0)) * inverseVP;\n  v_rgbSE = (fragCoord + vec2(1.0, 1.0)) * inverseVP;\n  v_rgbM = vec2(fragCoord * inverseVP);\n\n  gl_Position = projectionMatrix *\n              modelViewMatrix *\n              vec4(position,1.0);\n}\n',
		fragmentShader:
			'#define GLSLIFY 1\nvarying vec2 vUv;\n\n//texcoords computed in vertex step\n//to avoid dependent texture reads\nvarying vec2 v_rgbNW;\nvarying vec2 v_rgbNE;\nvarying vec2 v_rgbSW;\nvarying vec2 v_rgbSE;\nvarying vec2 v_rgbM;\n\n//make sure to have a resolution uniform set to the screen size\nuniform vec2 resolution;\nuniform sampler2D tDiffuse;\n\n/**\nBasic FXAA implementation based on the code on geeks3d.com with the\nmodification that the texture2DLod stuff was removed since it\'s\nunsupported by WebGL.\n\n--\n\nFrom:\nhttps://github.com/mitsuhiko/webgl-meincraft\n\nCopyright (c) 2011 by Armin Ronacher.\n\nSome rights reserved.\n\nRedistribution and use in source and binary forms, with or without\nmodification, are permitted provided that the following conditions are\nmet:\n\n    * Redistributions of source code must retain the above copyright\n      notice, this list of conditions and the following disclaimer.\n\n    * Redistributions in binary form must reproduce the above\n      copyright notice, this list of conditions and the following\n      disclaimer in the documentation and/or other materials provided\n      with the distribution.\n\n    * The names of the contributors may not be used to endorse or\n      promote products derived from this software without specific\n      prior written permission.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS\n"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT\nLIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR\nA PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT\nOWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,\nSPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT\nLIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,\nDATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY\nTHEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\nOF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n*/\n\n#ifndef FXAA_REDUCE_MIN\n    #define FXAA_REDUCE_MIN   (1.0/ 128.0)\n#endif\n#ifndef FXAA_REDUCE_MUL\n    #define FXAA_REDUCE_MUL   (1.0 / 8.0)\n#endif\n#ifndef FXAA_SPAN_MAX\n    #define FXAA_SPAN_MAX     8.0\n#endif\n\n//optimized version for mobile, where dependent \n//texture reads can be a bottleneck\nvec4 fxaa_1540259130(sampler2D tex, vec2 fragCoord, vec2 resolution,\n            vec2 v_rgbNW, vec2 v_rgbNE, \n            vec2 v_rgbSW, vec2 v_rgbSE, \n            vec2 v_rgbM) {\n    vec4 color;\n    mediump vec2 inverseVP = vec2(1.0 / resolution.x, 1.0 / resolution.y);\n    vec3 rgbNW = texture2D(tex, v_rgbNW).xyz;\n    vec3 rgbNE = texture2D(tex, v_rgbNE).xyz;\n    vec3 rgbSW = texture2D(tex, v_rgbSW).xyz;\n    vec3 rgbSE = texture2D(tex, v_rgbSE).xyz;\n    vec4 texColor = texture2D(tex, v_rgbM);\n    vec3 rgbM  = texColor.xyz;\n    vec3 luma = vec3(0.299, 0.587, 0.114);\n    float lumaNW = dot(rgbNW, luma);\n    float lumaNE = dot(rgbNE, luma);\n    float lumaSW = dot(rgbSW, luma);\n    float lumaSE = dot(rgbSE, luma);\n    float lumaM  = dot(rgbM,  luma);\n    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));\n    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));\n    \n    mediump vec2 dir;\n    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));\n    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));\n    \n    float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) *\n                          (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);\n    \n    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);\n    dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),\n              max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),\n              dir * rcpDirMin)) * inverseVP;\n    \n    vec3 rgbA = 0.5 * (\n        texture2D(tex, fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5)).xyz +\n        texture2D(tex, fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5)).xyz);\n    vec3 rgbB = rgbA * 0.5 + 0.25 * (\n        texture2D(tex, fragCoord * inverseVP + dir * -0.5).xyz +\n        texture2D(tex, fragCoord * inverseVP + dir * 0.5).xyz);\n\n    float lumaB = dot(rgbB, luma);\n    if ((lumaB < lumaMin) || (lumaB > lumaMax))\n        color = vec4(rgbA, texColor.a);\n    else\n        color = vec4(rgbB, texColor.a);\n    return color;\n}\n\nvoid main() {\n  vec2 fragCoord = vUv * resolution;   \n  gl_FragColor = fxaa_1540259130(tDiffuse, fragCoord, resolution, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);\n}\n',
	})
}

export function providePassArgs(passProps, sceneObjs) {
	const MAGIC_HEADER = '_provide_'
	for (let i = 0; i < passProps.length; i++) {
		const item = passProps[i]
		if (typeof item === 'string' && item.startsWith(MAGIC_HEADER)) {
			const name = item.substring(item.indexOf(MAGIC_HEADER) + MAGIC_HEADER.length, item.length)
			if (sceneObjs[name]) {
				passProps[i] = sceneObjs[name]
			}
		}
	}
}

export function calcCamNearFar(cameraProxy) {
	if (cameraProxy['zoom'] === undefined || cameraProxy['distance'] === undefined) {
		return []
	}
	let near, far
	if (cameraProxy.zoom <= 5) {
		// 看地球，太阳系?
		near = Math.max(100000, cameraProxy.distance - (16 - cameraProxy.zoom) * 2 * R) // zoom 1 -> 16 R
		far = cameraProxy.distance + (16 - cameraProxy.zoom) * 2 * R // 16 R
	} else if (cameraProxy.zoom > 5 && cameraProxy.zoom <= 12.5) {
		// 看国家、省份
		near = Math.max(10, cameraProxy.distance / 100)
		// percent最大不超过1/8，和下一级far保持一致
		const percent = Math.max(1 / 8, (17.5 - cameraProxy.zoom) / 12.5)
		far = cameraProxy.distance + 4 * R * percent
	} else if (cameraProxy.zoom > 12.5 && cameraProxy.zoom <= 16.5) {
		// 看城市
		near = Math.max(100, cameraProxy.distance / 40)
		// far = cameraProxy.distance + 0.25 * R
		const percent = (17.5 - cameraProxy.zoom) / 6
		far = cameraProxy.distance + 0.4 * R * percent
	} else {
		// 微距？
		near = 10
		const percent = (24 - cameraProxy.zoom) / 8
		far = cameraProxy.distance + 200000 * percent
	}
	// console.log('zoom, dis', cameraProxy.zoom, cameraProxy.distance)
	// console.log('near, far', near, far)
	return [near, far]
}

export function colorToString(RGB): string {
	if (Array.isArray(RGB)) {
		// if (RGB.length === 3) {
		return 'rgb(' + RGB.join(',') + ')'
		// } else {
		// 	console.warn('RGB应该为3位，alpha通道可能不会支持')
		// 	return 'rgba(' + RGB.join(',') + ')'
		// }
	} else {
		// undefined | string
		return RGB
	}
}
