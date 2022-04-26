#version 300 es
precision highp float;
precision highp int;

#define SHADER_NAME BlurPass

uniform vec2 texelSize;
uniform vec2 halfTexelSize;
uniform float kernel;

in vec2 uv;
in vec3 position;

out vec2 vUv0;
out vec2 vUv1;
out vec2 vUv2;
out vec2 vUv3;

void main() {

  vec2 dUv = (texelSize * vec2(kernel)) + halfTexelSize;

  vUv0 = vec2(uv.x - dUv.x, uv.y + dUv.y);
  vUv1 = vec2(uv.x + dUv.x, uv.y + dUv.y);
  vUv2 = vec2(uv.x + dUv.x, uv.y - dUv.y);
  vUv3 = vec2(uv.x - dUv.x, uv.y - dUv.y);

  gl_Position = vec4(position, 1.0);

  // gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
