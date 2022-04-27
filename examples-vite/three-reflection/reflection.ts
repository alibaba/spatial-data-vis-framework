import { UnlitMaterial, Mesh } from '@gs.i/frontend-sdk'
import { buildPlane } from '@gs.i/utils-geom-builders'
import { StandardLayer } from '@polaris.gl/gsi'
import { PolarisThree } from '@polaris.gl/three'

import { generateScene } from '@gs.i/utils-random-scene'
import { IndicatorProcessor } from '@gs.i/processor-indicator'
import { HelperLayer } from '@polaris.gl/layer-std-helper'
import { LodLineStringLayer, PolygonLayer } from '@polaris.gl/layer-geojson'

import * as IR from '@gs.i/schema-scene'
import { MercatorProjection } from '@polaris.gl/projection'

const indicator = new IndicatorProcessor({
	useWireframe: true,
	useBBox: true,
})

const container = document.querySelector('#container') as HTMLDivElement
const p = new PolarisThree({
	container,
	autoResize: true,
	enableReflection: true,
})

const h = new HelperLayer({ length: 10000 })
// p.add(h)
h.setProps({ box: false })

globalThis.p = p
console.log(p)

// 光滑
{
	const scene = generateScene({
		scale: 1000,
		count: 10,
		depth: 10,
		useAnimation: true,
		useSprite: false,
		usePoint: false,
		useGLine: false,
		resolution: [500, 500],
	})
	// indicator.traverse(scene)

	const l = new StandardLayer({ projection: new MercatorProjection({ center: [0.03, 0] }) })
	l.view.gsi.group.add(scene)
	p.add(l)

	// 地面

	const ocean = new StandardLayer({ projection: new MercatorProjection({ center: [0.03, 0] }) })
	p.add(ocean)

	const oceanGeom = buildPlane({ width: 5000, height: 5000 })
	const oceanMatr = new UnlitMaterial({})
	oceanMatr.uniforms.reflectionMatrix = { value: p.reflectionMatrix as IR.Matrix }
	oceanMatr.uniforms.reflectionTexture = { value: p.reflectionTexture as IR.Texture }
	// oceanMatr.uniforms.reflectionTextureBlur = { value: p.reflectionTextureBlur as IR.Texture }
	oceanMatr.global = /* glsl */ `
	uniform mat4 reflectionMatrix;
	uniform sampler2D reflectionTexture;
	varying vec4 vUvReflection;
`
	oceanMatr.vertGeometry = /* glsl */ `
	vec4 _worldPosition = modelMatrix * vec4( position, 1.0 );
	vUvReflection = reflectionMatrix * vec4( _worldPosition.xyz, 1.0 );
`
	oceanMatr.fragOutput = /* glsl */ `
	vec4 reflectionColor = texture2DProj( reflectionTexture, vUvReflection );
	fragColor = vec4(reflectionColor.rgb, 1.0);
`
	const oceanMesh = new Mesh({ geometry: oceanGeom, material: oceanMatr })
	ocean.view.gsi.group.add(oceanMesh)

	// indicator.traverse(oceanMesh)
}

// 粗糙
{
	const scene = generateScene({
		scale: 1000,
		count: 10,
		depth: 10,
		useAnimation: true,
		useSprite: false,
		usePoint: false,
		useGLine: false,
		resolution: [500, 500],
	})
	// indicator.traverse(scene)

	const l = new StandardLayer({ projection: new MercatorProjection({ center: [-0.03, 0] }) })
	l.view.gsi.group.add(scene)
	p.add(l)

	// 地面

	const ocean = new StandardLayer({ projection: new MercatorProjection({ center: [-0.03, 0] }) })
	p.add(ocean)

	const oceanGeom = buildPlane({ width: 5000, height: 5000 })
	const oceanMatr = new UnlitMaterial({})
	oceanMatr.uniforms.reflectionMatrix = { value: p.reflectionMatrix as IR.Matrix }
	oceanMatr.uniforms.reflectionTextureBlur = { value: p.reflectionTextureBlur as IR.Texture }
	oceanMatr.global = /* glsl */ `
	uniform mat4 reflectionMatrix;
	uniform sampler2D reflectionTextureBlur;
	varying vec4 vUvReflection;
`
	oceanMatr.vertGeometry = /* glsl */ `
	vec4 _worldPosition = modelMatrix * vec4( position, 1.0 );
	vUvReflection = reflectionMatrix * vec4( _worldPosition.xyz, 1.0 );
`
	oceanMatr.fragOutput = /* glsl */ `
	vec4 reflectionColor = texture2DProj( reflectionTextureBlur, vUvReflection );
	fragColor = vec4(reflectionColor.rgb, 1.0);
`
	const oceanMesh = new Mesh({ geometry: oceanGeom, material: oceanMatr })
	ocean.view.gsi.group.add(oceanMesh)

	// indicator.traverse(oceanMesh)
}
