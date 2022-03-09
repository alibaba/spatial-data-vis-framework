import { Projection } from '@polaris.gl/projection'
import { Vector3, Matrix4 } from '@gs.i/utils-math'
// import { MeshDataType } from '@gs.i/schema-scene'

const up = new Vector3(0, 1, 0)
const _v0 = new Vector3()
/**
 * calculate the mesh orientation matrix with respect to the projection (often SphereProjections)
 * @param lnglatalt
 * @param projection
 * @param outNormal
 * @returns
 */
export function getOrientationMatrix(
	lnglatalt: number[],
	projection: Projection,
	outNormal: Vector3 | undefined = undefined
) {
	lnglatalt[2] = lnglatalt[2] ?? 0
	const position = projection.project(lnglatalt[0], lnglatalt[1], lnglatalt[2])
	const position2 = projection.project(lnglatalt[0], lnglatalt[1], lnglatalt[2] + 10)

	if (!outNormal) {
		outNormal = new Vector3()
	}
	outNormal
		.set(position2[0] - position[0], position2[1] - position[1], position2[2] - position[2])
		.normalize()

	return new Matrix4().lookAt(outNormal, _v0, up)
}

// const _mat0 = new Matrix4()
// const _mat1 = new Matrix4()
// /**
//  * Orient the given mesh to projection (often as SphereProjections)
//  * @param mesh
//  * @param projection
//  * @param lnglatalt
//  */
// export function orientMeshToProjection(
// 	mesh: MeshDataType,
// 	projection: Projection,
// 	lnglatalt: number[]
// ) {
// 	const matrix = getOrientationMatrix(lnglatalt, projection)
// 	_mat0.fromArray(mesh.transform.matrix)
// 	_mat1.multiplyMatrices(_mat0, matrix)
// 	mesh.transform.matrix = _mat1.toArray()
// }
