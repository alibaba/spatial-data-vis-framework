
#define SHADER_NAME BlurPass

uniform sampler2D tex;

in vec2 vUv0;
in vec2 vUv1;
in vec2 vUv2;
in vec2 vUv3;

void main() {

	// Sample top left texel.
	vec4 sum = texture(tex, vUv0);

	// Sample top right texel.
	sum += texture(tex, vUv1);

	// Sample bottom right texel.
	sum += texture(tex, vUv2);

	// Sample bottom left texel.
	sum += texture(tex, vUv3);

	// Compute the average.
	fragColor = sum * 0.25;

}
