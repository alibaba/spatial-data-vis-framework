/**
 * ground reflection based on reflection probe.
 */

import type { LiteRenderer } from './LiteRenderer'

import {
	Vector2,
	WebGLRenderTarget,
	PerspectiveCamera,
	NearestFilter,
	RGBFormat,
	LinearFilter,
} from 'three-lite'

export function initReflection(polarisRenderer: LiteRenderer) {
	const threeRenderer = polarisRenderer.renderer
	const config = polarisRenderer['config']

	const canvasSize = new Vector2()
	threeRenderer.getSize(canvasSize)

	const reflectionWidth = Math.floor(canvasSize.x * config.reflectionRatio)
	const reflectionHeight = Math.floor(canvasSize.y * config.reflectionRatio)

	const reflectionTexture = new WebGLRenderTarget(reflectionWidth, reflectionHeight, {
		minFilter: NearestFilter,
		magFilter: NearestFilter,
		format: RGBFormat,
		stencilBuffer: false,
		// depthBuffer: false,
	})
	reflectionTexture.texture.generateMipmaps = false

	const reflectionTextureFXAA = new WebGLRenderTarget(reflectionWidth, reflectionHeight, {
		minFilter: LinearFilter,
		magFilter: LinearFilter,
		format: RGBFormat,
		stencilBuffer: false,
		depthBuffer: false,
	})
	reflectionTextureFXAA.texture.generateMipmaps = false

	const reflectionTextureRough = new WebGLRenderTarget(reflectionWidth / 2, reflectionHeight / 2, {
		minFilter: LinearFilter,
		magFilter: LinearFilter,
		format: RGBFormat,
		stencilBuffer: false,
		depthBuffer: false,
	})
	reflectionTextureRough.texture.generateMipmaps = false

	const reflectionCamera = new PerspectiveCamera()

	reflectionCamera.name = 'reflectionCamera'
}

export function updateReflection(polarisRenderer: LiteRenderer) {}
