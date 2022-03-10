/**
 *
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * Codes in this file are edited from https://github.com/vanruesc/postprocessing.
 * The original license is as shown below.
 *
 * Copyright © 2015 Raoul van Rüschen
 *
 * This software is provided 'as-is', without any express or implied warranty. In
 * no event will the authors be held liable for any damages arising from the use of
 * this software.
 *
 * Permission is granted to anyone to use this software for any purpose, including
 * commercial applications, and to alter it and redistribute it freely, subject to
 * the following restrictions:
 *
 * 1. The origin of this software must not be misrepresented; you must not claim
 * that you wrote the original software. If you use this software in a product,
 * an acknowledgment in the product documentation would be appreciated but is
 * not required.
 *
 * 2. Altered source versions must be plainly marked as such, and must not be
 * misrepresented as being the original software.
 *
 * 3. This notice may not be removed or altered from any source distribution.
 *
 */

// postprocessing.d.ts
declare module 'postprocessing' {
	/**
	 * An abstract pass.
	 *
	 * Passes that do not rely on the depth buffer should explicitly disable the
	 * depth test and depth write in their respective shader materials.
	 *
	 * @implements {Resizable}
	 * @implements {Disposable}
	 */
	export abstract class Pass {
		/**
		 * Constructs a new pass.
		 *
		 * @param {String} [name] - The name of this pass. Does not have to be unique.
		 * @param {Scene} [scene] - The scene to render. The default scene contains a single mesh that fills the screen.
		 * @param {Camera} [camera] - The camera. The default camera perfectly captures the screen mesh.
		 */
		constructor(name?: string, scene?: any, camera?: any)

		/**
		 * The name of this pass.
		 *
		 * @type {String}
		 */
		name: string

		/**
		 * The scene to render.
		 *
		 * @type {THREE.Scene}
		 * @protected
		 */
		scene: any

		/**
		 * The camera.
		 *
		 * @type {THREE.Camera}
		 * @protected
		 */
		camera: any

		/**
		 * A quad mesh that fills the screen.
		 *
		 * @type {Mesh}
		 * @private
		 */
		quad: any

		/**
		 * Indicates whether this pass should render to screen.
		 *
		 * @type {Boolean}
		 */
		renderToScreen: boolean

		/**
		 * Indicates whether this pass should be executed.
		 *
		 * @type {Boolean}
		 */
		enabled: boolean

		/**
		 * Indicates whether the {@link EffectComposer} should swap the frame
		 * buffers after this pass has finished rendering.
		 *
		 * Set this to `false` if this pass doesn't render to the output buffer or
		 * the screen. Otherwise, the contents of the input buffer will be lost.
		 *
		 * @type {Boolean}
		 */
		needsSwap: boolean

		/**
		 * The fullscreen material.
		 *
		 * @type {Material}
		 * @deprecated Use getFullscreenMaterial() instead.
		 */
		public material: any

		/**
		 * Returns the current fullscreen material.
		 *
		 * @return {Material} The current fullscreen material, or null if there is none.
		 */
		getFullscreenMaterial(): any

		/**
		 * Sets the fullscreen material.
		 *
		 * The material will be assigned to the quad mesh that fills the screen. The
		 * screen quad will be created once a material is assigned via this method.
		 *
		 * @protected
		 * @param {Material} material - A fullscreen material.
		 */
		setFullscreenMaterial(material: any): void

		/**
		 * Renders the effect.
		 *
		 * This is an abstract method that must be overridden.
		 *
		 * @abstract
		 * @throws {Error} An error is thrown if the method is not overridden.
		 * @param {WebGLRenderer} renderer - The renderer.
		 * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
		 * @param {WebGLRenderTarget} outputBuffer - A frame buffer that serves as the output render target unless this pass renders to screen.
		 * @param {Number} [delta] - The time between the last frame and the current one in seconds.
		 * @param {Boolean} [stencilTest] - Indicates whether a stencil mask is active.
		 */
		abstract render(
			renderer: any,
			inputBuffer: any,
			outputBuffer: any,
			delta?: number,
			stencilTest?: boolean
		): void

		/**
		 * Updates this pass with the renderer's size.
		 *
		 * You may override this method in case you want to be informed about the main
		 * render size.
		 *
		 * The {@link EffectComposer} calls this method before this pass is
		 * initialized and every time its own size is updated.
		 *
		 * @param {Number} width - The renderer's width.
		 * @param {Number} height - The renderer's height.
		 * @example this.myRenderTarget.setSize(width, height);
		 */
		setSize(width: number, height: number): void

		/**
		 * Performs initialization tasks.
		 *
		 * By overriding this method you gain access to the renderer. You'll also be
		 * able to configure your custom render targets to use the appropriate format
		 * (RGB or RGBA).
		 *
		 * The provided renderer can be used to warm up special off-screen render
		 * targets by performing a preliminary render operation.
		 *
		 * The {@link EffectComposer} calls this method when this pass is added to its
		 * queue, but not before its size has been set.
		 *
		 * @param {WebGLRenderer} renderer - The renderer.
		 * @param {Boolean} alpha - Whether the renderer uses the alpha channel or not.
		 * @example if(!alpha) { this.myRenderTarget.texture.format = RGBFormat; }
		 */
		initialize(renderer: any, alpha: boolean): void

		/**
		 * Performs a shallow search for disposable properties and deletes them. The
		 * pass will be inoperative after this method was called!
		 *
		 * Disposable objects:
		 *  - WebGLRenderTarget
		 *  - Material
		 *  - Texture
		 *
		 * The {@link EffectComposer} calls this method when it is being destroyed.
		 * You may, however, use it independently to free memory when you are certain
		 * that you don't need this pass anymore.
		 */
		dispose(): void
	}

	/**
	 * The EffectComposer may be used in place of a normal WebGLRenderer.
	 *
	 * The auto clear behaviour of the provided renderer will be disabled to prevent
	 * unnecessary clear operations.
	 *
	 * It is common practice to use a {@link RenderPass} as the first pass to
	 * automatically clear the screen and render the scene to a texture for further
	 * processing.
	 *
	 * @implements {Resizable}
	 * @implements {Disposable}
	 */
	export class EffectComposer {
		/**
		 * Constructs a new effect composer.
		 *
		 * @param {WebGLRenderer} [renderer] - The renderer that should be used.
		 * @param {Object} [options] - The options.
		 * @param {Boolean} [options.depthBuffer=true] - Whether the main render targets should have a depth buffer.
		 * @param {Boolean} [options.stencilBuffer=false] - Whether the main render targets should have a stencil buffer.
		 * @param {Boolean} [options.depthTexture=false] - Set to true if one of your passes relies on a depth texture.
		 */
		constructor(renderer?: any, options?: any)

		/**
		 * The renderer.
		 *
		 * You may replace the renderer at any time by using
		 * {@link EffectComposer#replaceRenderer}.
		 *
		 * @type {WebGLRenderer}
		 */
		renderer: any

		/**
		 * The input buffer.
		 *
		 * Reading from and writing to the same render target should be avoided.
		 * Therefore, two seperate yet identical buffers are used.
		 *
		 * @type {WebGLRenderTarget}
		 * @private
		 */
		inputBuffer: any

		/**
		 * The output buffer.
		 *
		 * @type {WebGLRenderTarget}
		 * @private
		 */
		outputBuffer: any

		/**
		 * A copy pass used for copying masked scenes.
		 *
		 * @type {ShaderPass}
		 * @private
		 */
		copyPass: Pass

		/**
		 * The passes.
		 *
		 * @type {Pass[]}
		 * @private
		 */
		passes: Pass[]

		/**
		 * The input and output buffers share a single depth texture. Depth will be
		 * written to this texture when something is rendered into one of the buffers
		 * and the involved materials have depth write enabled.
		 *
		 * You may enable this mechanism during the instantiation of the composer or
		 * by assigning a DepthTexture instance later on. You may also disable it by
		 * assigning null.
		 *
		 * @type {DepthTexture}
		 */
		depthTexture: DepthTexture

		/**
		 * Replaces the current renderer with the given one. The DOM element of the
		 * current renderer will automatically be removed from its parent node and the
		 * DOM element of the new renderer will take its place.
		 *
		 * The auto clear mechanism of the provided renderer will be disabled.
		 *
		 * Switching between renderers allows you to dynamically enable or disable
		 * antialiasing.
		 *
		 * @param {WebGLRenderer} renderer - The new renderer.
		 * @return {WebGLRenderer} The old renderer.
		 */

		replaceRenderer(renderer: any): any

		/**
		 * Creates a new render target by replicating the renderer's canvas.
		 *
		 * The created render target uses a linear filter for texel minification and
		 * magnification. Its render texture format depends on whether the renderer
		 * uses the alpha channel. Mipmaps are disabled.
		 *
		 * @param {Boolean} depthBuffer - Whether the render target should have a depth buffer.
		 * @param {Boolean} stencilBuffer - Whether the render target should have a stencil buffer.
		 * @param {Boolean} depthTexture - Whether the render target should have a depth texture.
		 * @return {WebGLRenderTarget} A new render target that equals the renderer's canvas.
		 */

		createBuffer(depthBuffer: boolean, stencilBuffer: boolean, depthTexture: boolean): any

		/**
		 * Adds a pass, optionally at a specific index.
		 *
		 * @param {Pass} pass - A new pass.
		 * @param {Number} [index] - An index at which the pass should be inserted.
		 */

		addPass(pass: Pass, index?: number): void

		/**
		 * Removes a pass.
		 *
		 * @param {Pass} pass - The pass.
		 */
		removePass(pass: Pass): void

		/**
		 * Renders all enabled passes in the order in which they were added.
		 *
		 * @param {Number} delta - The time between the last frame and the current one in seconds.
		 */
		render(delta: number): void

		/**
		 * Sets the size of the buffers and the renderer's output canvas.
		 *
		 * Every pass will be informed of the new size. It's up to each pass how that
		 * information is used.
		 *
		 * If no width or height is specified, the render targets and passes will be
		 * updated with the current size of the renderer.
		 *
		 * @param {Number} [width] - The width.
		 * @param {Number} [height] - The height.
		 */
		setSize(width: number, height: number): void

		/**
		 * Resets this composer by deleting all passes and creating new buffers.
		 */
		reset(): void

		/**
		 * Destroys this composer and all passes.
		 *
		 * This method deallocates all disposable objects created by the passes. It
		 * also deletes the main frame buffers of this composer.
		 */
		dispose(): void
	}

	/**
	 * A shader pass.
	 *
	 * Used to render any shader material as a 2D filter.
	 */
	export class ShaderPass extends Pass {
		/**
		 * Constructs a new shader pass.
		 *
		 * @param {ShaderMaterial} material - The shader material to use.
		 * @param {String} [textureID="tDiffuse"] - The texture uniform identifier.
		 */
		constructor(material: any, textureID?: string)

		/**
		 * The name of the color sampler uniform of the given material.
		 *
		 * @type {String}
		 */
		textureID: string
	}

	/**
	 * An efficient, incremental blur pass.
	 *
	 * Note: This pass allows the input and output buffer to be the same.
	 */

	export class BlurPass extends Pass {
		/**
		 * Constructs a new blur pass.
		 *
		 * @param {Object} [options] - The options.
		 * @param {Number} [options.resolutionScale=0.5] - The render texture resolution scale, relative to the screen render size.
		 * @param {Number} [options.kernelSize=KernelSize.LARGE] - The blur kernel size.
		 */
		constructor(options?: any)

		/**
		 * The absolute width of the internal render targets.
		 *
		 * @type {Number}
		 */
		width: number

		/**
		 * The absolute height of the internal render targets.
		 *
		 * @type {Number}
		 */
		height: number

		/**
		 * The kernel size.
		 *
		 * @type {KernelSize}
		 */
		kernelSize: any

		/**
		 * A render target.
		 *
		 * @type {WebGLRenderTarget}
		 * @private
		 */
		renderTargetX: any

		/**
		 * A second render target.
		 *
		 * @type {WebGLRenderTarget}
		 * @private
		 */
		renderTargetY: any

		/**
		 * The original resolution.
		 *
		 * @type {Vector2}
		 * @private
		 */
		resolution: Vector2

		/**
		 * The current resolution scale.
		 *
		 * @type {Number}
		 * @private
		 */
		resolutionScale: number

		/**
		 * A convolution shader material.
		 *
		 * @type {ConvolutionMaterial}
		 * @private
		 */
		convolutionMaterial: ConvolutionMaterial

		/**
		 * A convolution shader material that uses dithering.
		 *
		 * @type {ConvolutionMaterial}
		 * @private
		 */
		ditheredConvolutionMaterial: ConvolutionMaterial

		/**
		 * Whether the blurred result should also be dithered using noise.
		 *
		 * @type {Boolean}
		 */
		dithering: boolean

		/**
		 * Returns the current resolution scale.
		 *
		 * @return {Number} The resolution scale.
		 */
		getResolutionScale(): number

		/**
		 * Sets the resolution scale.
		 *
		 * @param {Number} scale - The new resolution scale.
		 */
		setResolutionScale(scale: number): void
	}

	/**
	 * A pass that renders the result from a previous pass to another render target.
	 */
	export class SavePass extends Pass {
		/**
		 * Constructs a new save pass.
		 *
		 * @param {WebGLRenderTarget} [renderTarget] - The render target to use for saving the input buffer.
		 * @param {Boolean} [resize=true] - Whether the render target should adjust to the size of the input buffer.
		 */
		constructor(renderTarget?: any, resize?: boolean)

		/**
		 * The render target.
		 *
		 * @type {WebGLRenderTarget}
		 */
		renderTarget: any

		/**
		 * Indicates whether the render target should be resized when the size of
		 * the composer's frame buffer changes.
		 *
		 * @type {Boolean}
		 */
		resize: boolean
	}

	/**
	 * A pass that disables the stencil test.
	 */
	export class ClearMaskPass extends Pass {
		/**
		 * Constructs a new clear mask pass.
		 */
		constructor()
	}

	import { Pass } from './Pass.js'

	/**
	 * A mask pass.
	 */
	export class MaskPass extends Pass {
		inverse: boolean

		clearStencil: boolean

		/**
		 * Constructs a new mask pass.
		 *
		 * @param {Scene} scene - The scene to render.
		 * @param {Camera} camera - The camera to use.
		 */

		constructor(scene, camera)
	}

	/**
	 * A kernel size enumeration.
	 *
	 * @type {Object}
	 * @property {Number} VERY_SMALL - A very small kernel that matches a 7x7 Gauss blur kernel.
	 * @property {Number} SMALL - A small kernel that matches a 15x15 Gauss blur kernel.
	 * @property {Number} MEDIUM - A medium sized kernel that matches a 23x23 Gauss blur kernel.
	 * @property {Number} LARGE - A large kernel that matches a 35x35 Gauss blur kernel.
	 * @property {Number} VERY_LARGE - A very large kernel that matches a 63x63 Gauss blur kernel.
	 * @property {Number} HUGE - A huge kernel that matches a 127x127 Gauss blur kernel.
	 */
	export const KernelSize = {
		VERY_SMALL: 0,
		SMALL: 1,
		MEDIUM: 2,
		LARGE: 3,
		VERY_LARGE: 4,
		HUGE: 5,
	}

	/**
	 * A simple copy shader material.
	 */
	export class CopyMaterial extends THREE.ShaderMaterial {
		/**
		 * Constructs a new copy material.
		 */
		constructor()
	}

	import { Color } from 'three'
	import { Pass } from './Pass.js'

	/**
	 * Used for saving the original clear color of the renderer.
	 *
	 * @type {Color}
	 * @private
	 */

	const color = new Color()

	/**
	 * A pass that clears the input buffer or the screen.
	 *
	 * You can prevent specific bits from being cleared by setting either the
	 * autoClearColor, autoClearStencil or autoClearDepth properties of the renderer
	 * to false.
	 */
	export class ClearPass extends Pass {
		clearColor: any

		clearAlpha: number

		/**
		 * Constructs a new clear pass.
		 *
		 * @param {Object} [options] - Additional options.
		 * @param {Color} [options.clearColor=null] - An override clear color.
		 * @param {Number} [options.clearAlpha=0.0] - An override clear alpha.
		 */
		constructor(options = {})
	}
}
