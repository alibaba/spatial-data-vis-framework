#version 300 es

#define SHADER_NAME Pass

precision highp float;
precision highp int;

in vec3 position;
in vec2 uv;
out vec2 pos;

void main() {
	// gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	gl_Position = vec4(position, 1.0);
	pos = uv;
}
