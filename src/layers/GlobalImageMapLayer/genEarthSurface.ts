import { buildPlane, buildSphere } from '@gs.i/utils-geom-builders'

import type { Projection } from '@polaris.gl/projection'

const R = 6378137
const DEG2RAD = Math.PI / 180

export function genEarthSurface(
	lngStart: number,
	lngSpan: number,
	latStart: number,
	latSpan: number,
	lngSegments: number,
	latSegments: number
) {
	const geom = buildSphere({
		radius: R,
		widthSegments: lngSegments,
		heightSegments: latSegments,
		phiStart: lngStart * DEG2RAD + Math.PI / 2,
		phiLength: lngSpan * DEG2RAD,
		thetaStart: Math.PI / 2 - (latStart * DEG2RAD + latSpan * DEG2RAD),
		thetaLength: latSpan * DEG2RAD,
		normal: true,
		uv: true,
	})

	return geom
}
export function genFlatEarthSurface(
	projection: Projection,
	lngStart: number,
	lngSpan: number,
	latStart: number,
	latSpan: number,
	lngSegments: number,
	latSegments: number
) {
	// @note 只有 可平移的平面投影才可以这样做
	const [startX, startY] = projection.project(lngStart, latStart)
	const [endX, endY] = projection.project(lngStart + lngSpan, latStart + latSpan)

	const width = endX - startX
	const height = endY - startY

	const geom = buildPlane({
		width,
		height,
		normal: true,
		uv: true,
		widthSegments: lngSegments,
		heightSegments: latSegments,
	})

	const pos = geom.attributes.position?.array

	if (pos && pos !== '__DISPOSED__') {
		for (let i = 0; i < pos.length; i += 3) {
			pos[i] += startX + width * 0.5
			pos[i + 1] += startY + height * 0.5
		}
	}

	;(geom.extensions as any).EXT_geometry_bounds = {}

	// const geom = buildSphere({
	// 	radius: R,
	// 	widthSegments: lngSegments,
	// 	heightSegments: latSegments,
	// 	phiStart: lngStart * DEG2RAD + Math.PI / 2,
	// 	phiLength: lngSpan * DEG2RAD,
	// 	thetaStart: Math.PI / 2 - (latStart * DEG2RAD + latSpan * DEG2RAD),
	// 	thetaLength: latSpan * DEG2RAD,
	// 	normal: true,
	// 	uv: true,
	// })

	return geom
}
