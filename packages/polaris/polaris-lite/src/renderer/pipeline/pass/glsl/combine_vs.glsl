// #include <stdvs>

#define SHADER_NAME CombinePass

out vec2 vUv;

void main() {
	vUv = uv;
	gl_Position = vec4(position, 1.0);
}