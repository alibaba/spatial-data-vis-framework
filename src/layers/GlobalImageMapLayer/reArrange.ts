import type { IR } from '@gs.i/schema-scene'

import type { Projection } from '@polaris.gl/projection'

/**
 * 重新组织地图的三角形，把太平洋放中心
 * @note 不重新三角话，只横向挪动现有三角形
 */
export function reArrange(geom: IR.Geometry, proj: Projection) {
	const offset = proj.project(180, 0, 0)[0] - proj.project(-180, 0, 0)[0]
	const midline = proj.project(0, 0, 0)[0]

	const pos = geom.attributes.position?.array
	if (pos && pos !== '__DISPOSED__') {
		for (let i = 0; i < pos.length; i += 3) {
			const originalX = pos[i + 0]

			if (originalX < midline) {
				pos[i] = originalX + offset
			}
		}
	}

	const uv = geom.attributes.uv?.array
	if (uv && uv !== '__DISPOSED__') {
		for (let i = 0; i < uv.length; i += 2) {
			const originalU = uv[i + 0]

			if (originalU < 0.5) {
				uv[i] = originalU + 1
			}
		}
	}
}
