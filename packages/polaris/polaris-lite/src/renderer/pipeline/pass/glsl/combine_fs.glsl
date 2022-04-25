// #include <stdfs>
// #include <common>
// #include <packing>

#define SHADER_NAME CombinePass

uniform sampler2D tex;

#if ( ADD > 0 )
    uniform sampler2D add[ADD];
    uniform float addFactor[ADD];
#endif

#if ( MULTI > 0 )
    uniform sampler2D multi[MULTI];
    uniform float multiFactor[MULTI];
#endif

#if ( MIX_ALPHA > 0 )
    uniform sampler2D mixAlpha[MIX_ALPHA];
    uniform float mixAlphaFactor[MIX_ALPHA];
#endif

#if ( EXTRA_REFLECTION > 0 )
    uniform sampler2D extraReflection[EXTRA_REFLECTION];
    uniform float extraReflectionFactor[EXTRA_REFLECTION];
#endif

#if ( REFLECTION > 0 )
    uniform sampler2D reflection[REFLECTION];
    uniform float reflectionFactor[REFLECTION];
#endif

in vec2 vUv;

void main() {
    vec4 color = texture(tex, vUv);

    #if ( EXTRA_REFLECTION > 0 )
        for ( int i = 0; i < EXTRA_REFLECTION; i ++ ) {
            vec4 t = texture(extraReflection[ i ], vUv);
            // vec3 blended = vec3(
            //     t.r > 0.5 ? (1.0 - 2.0 * (1.0 - color.r) * (1.0 - t.r)) : 2.0 * color.r * t.r,
            //     t.g > 0.5 ? (1.0 - 2.0 * (1.0 - color.g) * (1.0 - t.g)) : 2.0 * color.g * t.g,
            //     t.b > 0.5 ? (1.0 - 2.0 * (1.0 - color.b) * (1.0 - t.b)) : 2.0 * color.b * t.b
            // );
            vec3 blended = vec3(
                // color.r / (1.0 - t.r),
                // color.g / (1.0 - t.g),
                // color.b / (1.0 - t.b)
                // t.r / (1.0 - color.r),
                // t.g / (1.0 - color.g),
                // t.b / (1.0 - color.b)
                t.r > 0.5 ? color.r + t.r * (t.r * 2.0) : (color.r * (t.r * 2.0)) + t.r,
                t.g > 0.5 ? color.g + t.g * (t.g * 2.0) : (color.g * (t.g * 2.0)) + t.g,
                t.b > 0.5 ? color.b + t.b * (t.b * 2.0) : (color.b * (t.b * 2.0)) + t.b
                // t.r > 0.5 ? color.r + t.r : 0.0,
                // t.g > 0.5 ? color.g + t.g : 0.0,
                // t.b > 0.5 ? color.b + t.b : 0.0
            );
            color.rgb = mix(color.rgb, blended.rgb, extraReflectionFactor[ i ] * t.a);
        }
    #endif

    #if ( REFLECTION > 0 )
        for ( int i = 0; i < REFLECTION; i ++ ) {
            vec4 t = texture(reflection[ i ], vUv);
            // vec3 blended = vec3(
            //     t.r > 0.5 ? (1.0 - 2.0 * (1.0 - color.r) * (1.0 - t.r)) : 2.0 * color.r * t.r,
            //     t.g > 0.5 ? (1.0 - 2.0 * (1.0 - color.g) * (1.0 - t.g)) : 2.0 * color.g * t.g,
            //     t.b > 0.5 ? (1.0 - 2.0 * (1.0 - color.b) * (1.0 - t.b)) : 2.0 * color.b * t.b
            // );
            vec3 blended = vec3(
                // color.r / (1.0 - t.r),
                // color.g / (1.0 - t.g),
                // color.b / (1.0 - t.b)
                // t.r / (1.0 - color.r),
                // t.g / (1.0 - color.g),
                // t.b / (1.0 - color.b)
                t.r > 0.5 ? color.r + t.r : (color.r * (t.r * 2.0)) + t.r,
                t.g > 0.5 ? color.g + t.g : (color.g * (t.g * 2.0)) + t.g,
                t.b > 0.5 ? color.b + t.b : (color.b * (t.b * 2.0)) + t.b
                // t.r > 0.5 ? color.r + t.r : 0.0,
                // t.g > 0.5 ? color.g + t.g : 0.0,
                // t.b > 0.5 ? color.b + t.b : 0.0
            );
            color.rgb = mix(color.rgb, blended.rgb, reflectionFactor[ i ] * t.a);
        }
    #endif

    #if ( MIX_ALPHA > 0 )
        for ( int i = 0; i < MIX_ALPHA; i ++ ) {
            vec4 t = texture(mixAlpha[ i ], vUv);
            color.rgb = mix(color.rgb, t.rgb, mixAlphaFactor[ i ] * t.a);
        }
    #endif

    #if ( MULTI > 0 )
        for ( int i = 0; i < MULTI; i ++ ) {
            vec4 t = texture(multi[ i ], vUv);
            color.rgb *= mix(vec3(1.0), t.rgb * t.a, multiFactor[ i ]);
        }
    #endif

    #if ( ADD > 0 )
        for ( int i = 0; i < ADD; i ++ ) {
            vec4 t = texture(add[ i ], vUv);
            color.rgb += mix(vec3(0.0), t.rgb * t.a,  addFactor[ i ]);
        }
    #endif

    gl_FragColor = color;
}
