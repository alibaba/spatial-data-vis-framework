#version 300 es
precision highp float;
precision highp int;

in vec2 uv;
in vec3 position;

varying vec2 vUv;

void main() {

  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
