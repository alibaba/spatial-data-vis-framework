#version 300 es

#define SHADER_NAME Pass

precision highp float;
precision highp int;

uniform sampler2D tex;

out vec4 fragColor;
in vec2 pos;

// depthTexture ↓
#define cameraNear 1.0
#define cameraFar 100.0

float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
    return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float linearClipZ, const in float near, const in float far ) {
    return linearClipZ * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
    return (( near + viewZ ) * far ) / (( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float invClipZ, const in float near, const in float far ) {
    return ( near * far ) / ( ( far - near ) * invClipZ - far );
}
float readDepth( sampler2D depthSampler, vec2 coord ) {
    float fragCoordZ = texture( depthSampler, coord ).x;
    float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
    return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
}
// depthTexture ↑

void main() {
	fragColor = texture(tex, pos);

    // depthTexture ↓
    // float depth = readDepth( tex, pos );
    // fragColor.rgb = 1.0 - vec3( depth );
    // fragColor.a = 1.0;
}
