import type { IR } from '@gs.i/schema-scene'

import type { Projection } from '@polaris.gl/projection'

/**
 * ReProject a geometry from source projection to target projection.
 */
export function reProject(geom: IR.Geometry, sourceProj: Projection, targetProj: Projection) {
	const pos = geom.attributes.position?.array
	if (pos && pos !== '__DISPOSED__') {
		for (let i = 0; i < pos.length; i += 3) {
			let unproject = sourceProj.unproject.bind(sourceProj)

			if (sourceProj.type === 'EquirectangularProjection') {
				// @TODO EquirectangularProjection 没实现 unproject
				// @TODO 挪到 EquirectangularProjection 里

				const MAX_LATITUDE = 90
				const DEG2RAD = Math.PI / 180
				const R = 6378137

				const xyz0 = sourceProj['_xyz0']

				unproject = (x: number, y: number, z: number) => {
					const lng = (x / R + xyz0[0]) / DEG2RAD
					const lat = (y / R + xyz0[1]) / DEG2RAD
					const alt = z + xyz0[2]

					return [lng, lat, alt]
				}
			}

			const originalX = pos[i + 0]
			const originalY = pos[i + 1]
			const originalZ = pos[i + 2]
			const [lng, lat, alt] = unproject(originalX, originalY, originalZ)
			const [x, y, z] = targetProj.project(lng, lat, alt)
			pos[i] = x
			pos[i + 1] = y
			pos[i + 2] = z

			// console.log(
			// 	'reProject',
			// 	i,
			// 	'original',
			// 	originalX,
			// 	originalY,
			// 	originalZ,
			// 	'lla',
			// 	lng,
			// 	lat,
			// 	alt,
			// 	'new',
			// 	x,
			// 	y,
			// 	z
			// )
		}
	}
}
