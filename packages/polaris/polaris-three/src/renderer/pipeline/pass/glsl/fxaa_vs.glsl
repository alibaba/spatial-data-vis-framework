#version 300 es
precision highp float;
precision highp int;

#define SHADER_NAME FXAAPass

in vec2 uv;
in vec3 position;

out vec2 vUv;

out vec2 v_rgbNW;
out vec2 v_rgbNE;
out vec2 v_rgbSW;
out vec2 v_rgbSE;
out vec2 v_rgbM;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform vec2 resolution;

void main() {
  vUv = uv;
  vec2 fragCoord = uv * resolution;
  vec2 inverseVP = 1.0 / resolution.xy;
  v_rgbNW = (fragCoord + vec2(-1.0, -1.0)) * inverseVP;
  v_rgbNE = (fragCoord + vec2(1.0, -1.0)) * inverseVP;
  v_rgbSW = (fragCoord + vec2(-1.0, 1.0)) * inverseVP;
  v_rgbSE = (fragCoord + vec2(1.0, 1.0)) * inverseVP;
  v_rgbM = vec2(fragCoord * inverseVP);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
