#version 300 es
precision highp float;
precision highp int;

out vec4 fragColor;

// #define tDiffuse tex
// #define tDepth depthBuffer

// #include <common>
// #include <packing>

uniform sampler2D tDiffuse;
uniform sampler2D tDepth;

uniform float focus;
uniform float dof;
uniform float aperture;
uniform float maxBlur;

uniform vec2 resolution;

uniform float gaussianKernel[6];

varying vec2 vUv;

#include <packing>

uniform float cameraNear;
uniform float cameraFar;

void main() {
  float fragCoordZ = texture2D(tDepth, vUv).x;
  float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
  float depth = -viewZ;

  float focusNear = focus - dof;
  float focusFar = focus + dof;

  // Calculate a DoF mask.
  float low = step(depth, focusNear);
  float high = step(focusFar, depth);

  float factor = (depth - focusNear) * low + (depth - focusFar) * high;

  float dis = clamp(factor * aperture, -maxBlur, maxBlur);

  dis = abs(dis);

  // if (dis < 0.5) {
  // 	// gl_FragColor = vec4(dis * 1.0);
  // 	// gl_FragColor.a = 1.0;
  // 	gl_FragColor = texture2D(tDiffuse, vUv);
  // } else {

  vec4 color = vec4(0.0);

  float weightAll = 0.0;

  // for (int i = 0; i < 6; i++) {
  int start = dis < 0.5 ? 3 : (dis < 1.0 ? 2 : 0);
  int count = dis < 0.5 ? 5 : (dis < 1.0 ? 4 : 6);
  for (int i = start; i < count; i++) {
    float fi = float(i);
// double pass高斯模糊
#ifdef DIRECTION_X
    float x = (fi - 3.0) * dis / resolution.x;
    vec2 coord = vec2(vUv.x + x, vUv.y);
#else
    float y = (fi - 3.0) * dis / resolution.y;
    vec2 coord = vec2(vUv.x, vUv.y + y);
#endif

    // TODO 双边过滤
    float w = gaussianKernel[i];
    weightAll += w;
    color += texture2D(tDiffuse, coord) * w;
  }

  fragColor = color / weightAll;
  // }

  // gl_FragColor = vec4(viewZ * - 0.0001);
  // gl_FragColor = vec4(factor * aperture * 1.0);
  // gl_FragColor = vec4(dofBlur.x * 100.0);
  // gl_FragColor = vec4(dis * 1.0);
  // gl_FragColor.a = 1.0;
}
