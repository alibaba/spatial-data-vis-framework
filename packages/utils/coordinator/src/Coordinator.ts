/**
 *
 */

import {
	Projection,
	GeocentricProjection,
	EquirectangularProjection,
	EquirectangularProjectionPDC,
	AzimuthalEquidistantProjection,
	GallStereoGraphicProjection,
	SphereProjection,
	MercatorProjection,
} from '@polaris.gl/projection'

import { Euler, Matrix4 } from '@gs.i/utils-math'

/**
 * ### Geo Coordinator.
 *
 * Calculate a matrix to align one projection to another.
 *
 * #### usage
 *
 * - traverse the layer graph (by any order)
 * - get `relative transform matrix` (local matrix) between parent layer's projection and current layer's projection
 * - apply local matrix to current layer's 3d wrapper
 *
 * #### Coordinate system
 *
 * axis: right-hand coordinate, x -> East, y -> North, z -> Up
 *
 * planer projections
 *
 * ![coordinate schematic](https://img.alicdn.com/imgextra/i2/O1CN016XFIuC1VD5do9vNnw_!!6000000002618-2-tps-303-219.png)
 *
 * spherical projections
 *
 * ![sphere](https://img.alicdn.com/imgextra/i1/O1CN01ZwcULk215p3f7iWsE_!!6000000006934-2-tps-421-290.png)
 *
 * #### logic
 *
 * 1. if projection and target projection are identical
 * 	- result will be identity matrix
 * 2. if projection and target projection are both planar projections
 * 	- result matrix will contain relative offset
 * 3. if projection and target projection are both spherical projections
 * 	- result matrix will be contain relative rotation
 * 4. if target projection is planer, current projection is spherical
 * 	- result will make current `earth` tangent to target's `ground` at center point (on ground)
 * 5. if target projection is spherical, current projection is planer
 * 	- result will make current `ground` tangent to target's `earth` at center point (on earth)
 *
 * @TODO optimization, should do dirty-check
 * @TODO support GeocentricProjection 地心投影
 */

export class Coordinator {
	/**
	 * get relative matrix from projection to target projection
	 *
	 * ```javascript
	 * matrix * projection(lngLat) ~> targetProjection(lngLat)
	 * ```
	 */
	static getRelativeMatrix(
		/**
		 * target projection
		 */
		targetProjection: Projection,
		/**
		 * self projection
		 */
		projection: Projection,
		/**
		 * visual center {[lng, lat]}
		 *
		 * If 2 projections create "congruent" maps. (2 figures have the same shape)
		 * Coordinator will give an matrix that transform vectors into the target space.
		 * So that 2 figures will be "coincide":
		 *
		 * ```javascript
		 * matrix * projection(ll) === targetProjection(ll)
		 * ```
		 *
		 * If 2 projection create different shapes of maps. You should input
		 * the visual center(LngLat). The returned matrix will make sure 2 projected
		 * figures align at visual center point:
		 *
		 * ```javascript
		 * matrix * projection(visualCenter) === targetProjection(visualCenter)
		 * matrix * projection(llNearBy) ≈ targetProjection(llNearBy)
		 * ```
		 */
		visualCenter: LngLat = [0, 0]
	) {
		// todo
		// if (targetProjection.isGeocentricProjection || projection.isGeocentricProjection)
		// 	throw new Error('GeocentricProjection is not implemented yet.')

		// 1.
		if (targetProjection === projection) return mat.identity().toArray()

		// 2.
		if (targetProjection.isPlaneProjection && projection.isPlaneProjection) {
			// projected visualCenter should be at the same position
			const centerPos = projection.project(...visualCenter)
			const centerPosParent = targetProjection.project(...visualCenter)
			const offset = [centerPosParent[0] - centerPos[0], centerPosParent[1] - centerPos[1]]
			mat.identity()
			mat.makeTranslation(offset[0], offset[1], 0)
			return mat.toArray()
		}

		// 3.
		if (targetProjection.isSphereProjection && projection.isSphereProjection) {
			// @note if source or/and target is geocentric, it still works
			const targetOrigin = (targetProjection as any)._xyz0
			const selfOrigin = (projection as any)._xyz0
			const offset = [
				selfOrigin[0] - targetOrigin[0],
				selfOrigin[1] - targetOrigin[1],
				selfOrigin[2] - targetOrigin[2],
			]
			mat.identity()
			mat.makeTranslation(offset[0], offset[1], offset[2])
			return mat.toArray()
		}

		// 4.
		if (targetProjection.isPlaneProjection && projection.isSphereProjection) {
			/*
			const selfOrigin = (projection as any)._xyz0 as [number, number, number]

			// move sphere center to origin（保证旋转中心）
			mat1.identity().makeTranslation(...selfOrigin)

			// rotate sphere to make visual center face the sky(z) (进行lngLat欧拉角旋转)
			mat2
				.identity()
				.makeRotationFromEuler(
					euler.set((visualCenter[1] - 0) * DEG2RAD, (0 - visualCenter[0]) * DEG2RAD, 0, 'XYZ')
				)

			// now visual center is at [0,0,R] (self local space)

			// move self so that two visual centers coincide
			const visualCenterPosInParent = targetProjection.project(...visualCenter)
			mat3
				.identity()
				.makeTranslation(
					visualCenterPosInParent[0],
					visualCenterPosInParent[1],
					visualCenterPosInParent[2] - R
				)

			// and we got the transform matrix of self relative to target
			mat.identity().multiply(mat3).multiply(mat2).multiply(mat1)

			return mat.toArray()
			*/

			sphericalToPlaner(projection, targetProjection, visualCenter, mat)
			return mat.toArray()
		}

		// 5.
		if (targetProjection.isSphereProjection && projection.isPlaneProjection) {
			/*
			const selfOrigin = (projection as any)._xyz0 as [number, number, number]

			// move self visual center to [0,0,R]
			const visualCenterPosInSelf = projection.project(...visualCenter)
			mat1
				.identity()
				.makeTranslation(
					-visualCenterPosInSelf[0],
					-visualCenterPosInSelf[1],
					-visualCenterPosInSelf[2] + R
				)

			// rotate plane to make plane z face earth sky
			// and we got the transform matrix of self relative to target
			mat.identity().multiply(mat3).multiply(mat2).multiply(mat1)
			*/

			sphericalToPlaner(targetProjection, projection, visualCenter, mat)
			mat.invert()

			return mat.toArray()
		}

		throw new Error('Unsupported projection type: ' + projection.type + ',' + targetProjection.type)
	}
}

function sphericalToPlaner(
	source: Projection,
	target: Projection,
	visualCenter: LngLat,
	mat: Matrix4
) {
	const sourceOrigin = (source as any)._xyz0 as [number, number, number]

	// move sphere center to origin（保证旋转中心）
	mat1.identity().makeTranslation(...sourceOrigin)

	// rotate sphere to make visual center face the sky(z) (进行lngLat欧拉角旋转)
	mat2
		.identity()
		.makeRotationFromEuler(
			euler.set((visualCenter[1] - 0) * DEG2RAD, (0 - visualCenter[0]) * DEG2RAD, 0, 'XYZ')
		)

	// now visual center is at [0,0,R] (source local space)

	// move self so that two visual centers coincide
	const visualCenterPosInParent = target.project(...visualCenter)
	mat3
		.identity()
		.makeTranslation(
			visualCenterPosInParent[0],
			visualCenterPosInParent[1],
			visualCenterPosInParent[2] - R
		)

	// and we got the transform matrix of self relative to target
	mat.identity().multiply(mat3).multiply(mat2).multiply(mat1)
}

function sphericalToGeocentric(
	source: Projection,
	target: Projection,
	visualCenter: LngLat,
	mat: Matrix4
) {
	const sourceOrigin = (source as any)._xyz0
	mat.identity()
	mat.makeTranslation(sourceOrigin[0], sourceOrigin[1], sourceOrigin[2])
}

type LngLat = readonly [number, number]

const mat = new Matrix4()
const mat1 = new Matrix4()
const mat2 = new Matrix4()
const mat3 = new Matrix4()

const euler = new Euler()

const DEG2RAD = Math.PI / 180

const R = 6378137
