import { UnlitMaterial } from '@gs.i/frontend-sdk'
import { ColorRGB, Texture, Vec2 } from '@gs.i/schema-scene'

export interface BillboardsConfig {
	// baseColorFactor: ColorRGB
	baseColorTexture?: Texture
	// /**
	//  * 是否适配图片长宽比
	//  * - true 保持内容长宽比，重采样为方形
	//  * - false 拉伸铺满
	//  */
	// imgFit?: boolean
	/**
	 * 是否打开闪烁动画
	 */
	// flicker: boolean
	/**
	 * 闪烁速度
	 */
	flickerSpeed?: number
	/**
	 * 闪烁密度，默认1，即全部显示
	 */
	density?: number
	/**
	 * 尺寸，单位米
	 */
	size?: [number, number]
	// /**
	//  * 锚点，0-1
	//  */
	// pivot?: [number, number]
}

export const defaultConfig = {
	// baseColorFactor: { r: 1.0, g: 1.0, b: 1.0 },
	// imgFit: true,
	flickerSpeed: 1,
	density: 1,
	size: [10, 10],
	// pivot: [0.5, 0.5],
}

export class BillboardsMaterial extends UnlitMaterial {
	constructor(config: Partial<BillboardsConfig> = {}) {
		super()
		const _config = {
			...defaultConfig,
			...config,
		}
		const extensions = this.extensions

		this.uniforms.size = { value: { x: _config.size[0], y: _config.size[1] } }
		this.uniforms.flickerSpeed = { value: _config.flickerSpeed }
		this.uniforms.density = { value: _config.density }
		this.uniforms.time = { value: 0 }

		this.alphaMode = 'BLEND'

		// set properties
		// this.baseColorFactor = _config.baseColorFactor
		this.baseColorFactor = { r: 1.0, g: 1.0, b: 1.0 }
		this.baseColorTexture = _config.baseColorTexture

		// advanced props
		extensions.EXT_matr_advanced.depthTest = true
		// extensions.EXT_matr_advanced.depthWrite = true

		// shader codes

		extensions.EXT_matr_programmable.global = /* glsl */ `
			uniform vec2 size;
			// uniform vec2 pivot;
			uniform float flickerSpeed;
			uniform float density;
			uniform float time;
		`
		extensions.EXT_matr_programmable.vertGlobal = /* glsl */ `
			attribute float random;
			attribute vec2 offset;

			varying float v_random;
        `
		extensions.EXT_matr_programmable.vertGeometry = /* glsl */ `
			// if (corner == 0.0) { uv = vec2( 0.0, 0.0 ); }
			// if (corner == 1.0) { uv = vec2( 1.0, 0.0 ); }
			// if (corner == 2.0) { uv = vec2( 1.0, 1.0 ); }
			// if (corner == 3.0) { uv = vec2( 0.0, 1.0 ); }
        `
		extensions.EXT_matr_programmable.vertOutput = /* glsl */ `
    	// vec2 vert;
        // if (corner == 0.0) { vert = vec2( -0.5, -0.5 ); }
        // if (corner == 1.0) { vert = vec2( 0.5, -0.5 ); }
        // if (corner == 2.0) { vert = vec2( 0.5, 0.5 ); }
        // if (corner == 3.0) { vert = vec2( -0.5, 0.5 ); }

        // #ifdef GSI_USE_ATTR_TRANS
        //     vec2 scale = aScale;
        //     vec2 offset = aOffset;
        //     float rotation = aRotation;
        // #else
        //     vec2 scale = uScale;
        //     vec2 offset = uOffset;
        //     float rotation = uRotation;
        // #endif

        // #ifndef GSI_USE_SIZE_ATTENUATION
        //     bool isPerspective = projectionMatrix[ 2 ][ 3 ] == - 1.0;
        //     if ( isPerspective ) scale *= - modelViewPosition.z;
        // #endif

        // vec2 alignedPosition = ( vert.xy + offset ) * scale;
        // vec2 rotatedPosition;
        // float sinVal = sin( rotation );
        // float cosVal = cos( rotation );
	    // rotatedPosition.x = cosVal * alignedPosition.x - sinVal * alignedPosition.y;
	    // rotatedPosition.y = sinVal * alignedPosition.x + cosVal * alignedPosition.y;

			modelViewPosition.xy += offset * size;
			glPosition = projectionMatrix * modelViewPosition;

			v_random = random;
        `

		extensions.EXT_matr_programmable.fragGlobal = /* glsl */ `
			varying float v_random;
		`
		extensions.EXT_matr_programmable.fragOutput = /* glsl */ `

			float localP = fract(time * flickerSpeed + v_random);
			float showTime = density;
			// float hideTime = max(1.0 - showTime - showTime * 0.2, 0.0);
			float hideTime = max(1.0 - showTime - 0.2, 0.0);

			float flickerFactor = smoothstep(hideTime * 0.5, 0.5 - showTime * 0.5, localP) * smoothstep(1.0 - hideTime * 0.5, 0.5 + showTime * 0.5, localP);

			flickerFactor = density == 1.0 ? 1.0 : flickerFactor;
			flickerFactor = density == 0.0 ? 0.0 : flickerFactor;

			fragColor.a *= flickerFactor;
		`
	}
}
