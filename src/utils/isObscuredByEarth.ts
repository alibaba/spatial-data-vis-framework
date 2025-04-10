import { Vector3 } from '@gs.i/utils-math'

/**
 * 判断物体是否在地球的背面。
 *
 * 🌟早期的  MarkerLayer ，使用 normal 和视线的夹角来判断。
 *
 * ```
 * const worldMatrixUp = matPro.getWorldMatrix(anchorUp)
 * const worldPosUp = new Vector3(worldMatrixUp[12], worldMatrixUp[13], worldMatrixUp[14])
 * const dir = new Vector3(
 * 	worldPosUp.x - worldPos.x,
 * 	worldPosUp.y - worldPos.y,
 * 	worldPosUp.z - worldPos.z
 * )
 * dir.normalize()
 * const eyeDir = new Vector3(
 * 	worldPos.x - e.polaris.cameraProxy.position[0],
 * 	worldPos.y - e.polaris.cameraProxy.position[1],
 * 	worldPos.z - e.polaris.cameraProxy.position[2]
 * )
 * eyeDir.normalize()
 * const isFacing = dir.dot(eyeDir) < 0
 * ```
 *
 * ☝️但是这样没有考虑透视相机的 projection matrix，只在正交相机或者长焦等效时才正确的。
 * 在转动到边缘时，会出现判断不准确的情况。
 *
 * 🌟改进后使用了投影空间的 normal （将 mvp matrix 都乘进去）
 * 目前的 GPU 测判断都是这样的 @see BillboardMarkersLayer
 * 但是在 js 侧更新 MVP matrix 会造成麻烦的时序问题和性能问题，导致之前 marker layer 在相机突变时会出现定位延迟问题。
 *
 * ✅🌟那么，如何在没有相机矩阵和法向量的情况下判断？
 * 将问题转化为：地表上的物体是否被地表遮挡。
 * 需要：
 * - 物体的坐标
 * - 地心的坐标
 * - 相机的坐标
 * （三者只要在同一空间即可）
 * 向物体方向发射光线，计算与地表的交点，如果距离小于到物体的距离，则说明物体被地球遮挡。
 * 该点的计算很麻烦，而且两个交点要分别处理，更简单的方法是：
 * 该射线会与地表相交两次，只需要计算其中间点的距离即可（需要假设物体在地表以上）。
 *
 * ```
 * p_cam // 相机坐标
 * p_obj // 物体坐标
 * p_core // 地心坐标
 * R // 地球半径
 *
 * // 相机到地心的距离
 * cam_to_core = length(p_cam - p_core)
 * // 相机到物体的距离
 * cam_to_obj = length(p_cam - p_obj)
 * // 相机到物体的射线与相机到地心的射线的夹角
 * theta = acos(dot(normalize(p_cam - p_core), normalize(p_cam - p_obj)))
 * // 中间点到地心的距离
 * mid_to_core = cam_to_core * sin(theta)
 * // 相机到两个交点中心点的距离
 * cam_to_mid = cam_to_core * cos(theta)
 *
 * // 如果 mid_to_core >= R，说明视线和地表相切或者无交点
 * if (mid_to_core >= R) {
 * 	return false
 * }
 *
 * if (cam_to_mid < cam_to_obj) {
 *    // 物体被遮挡
 *   return true
 * } else {
 *   return false
 * }
 * ```
 */
export function isObscuredByEarth(
	cameraPos: Vector3,
	objectPos: Vector3,
	earthCenter: Vector3,
	earthRadius: number
): boolean {
	const camToCore = cameraPos.distanceTo(earthCenter)
	const camToObj = cameraPos.distanceTo(objectPos)

	const theta = Math.acos(
		cameraPos.clone().sub(earthCenter).normalize().dot(cameraPos.clone().sub(objectPos).normalize())
	)

	const midToCore = camToCore * Math.sin(theta)
	const camToMid = camToCore * Math.cos(theta)

	if (midToCore >= earthRadius) {
		return false
	}

	if (camToMid < camToObj) {
		return true
	} else {
		return false
	}
}
