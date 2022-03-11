import { Matrix4, Vector2, Vector3 } from '@gs.i/utils-math'
import { Projection } from '@polaris.gl/projection'
import type { StandardLayer } from './StandardLayer'

/**
 * get world matrix of this layer's 3d wrapper
 *
 * @description
 *
 * the result is the relative matrix between this layer's geographic
 * wrapper and polaris's root wrapper.
 *
 * ```
 * worldDecPos = result * localDecPos
 *```
 *
 * @note return undefined if not inited
 */
export function getWorldMatrix(layer: StandardLayer) {
	if (!layer.inited) {
		console.warn('can not call getWorldMatrix until layer is inited')
		return
	}

	const polaris = layer['polaris']

	return (
		polaris.matrixProcessor.getCachedWorldMatrix(layer.view.gsi.alignmentWrapper) ||
		polaris.matrixProcessor.getWorldMatrix(layer.view.gsi.alignmentWrapper)
	)
}

/**
 * 获取世界坐标在当前layer的经纬度
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @return {*}  {(number[] | undefined)}
 *
 * @note return undefined if not inited
 */
export function toLngLatAlt(
	layer: StandardLayer,
	worldPosX: number,
	worldPosY: number,
	worldPosZ: number
): number[] | undefined {
	if (!layer.inited) {
		console.warn('can not call toLngLatAlt until layer is inited')
		return
	}

	const projection = layer.resolveProjection() as Projection // this won't be null after inited

	const worldMatrix = getWorldMatrix(layer) as number[]
	const inverseMat = _mat4.fromArray(worldMatrix).invert()
	const v = _vec3.set(worldPosX, worldPosY, worldPosZ)
	// Transform to pure world xyz
	v.applyMatrix4(inverseMat)
	return projection.unproject(v.x, v.y, v.z)
}

/**
 * 获取经纬度对应的世界坐标
 *
 * @param {number} lng
 * @param {number} lat
 * @param {number} [alt=0]
 * @return {*}  {(Vector3 | undefined)}
 * If the layer has no projection, or a worldMatrix yet, an {undefined} result will be returned.
 *
 * @note return undefined if not inited
 */
export function toWorldPosition(
	layer: StandardLayer,
	lng: number,
	lat: number,
	alt = 0
): Vector3 | undefined {
	if (!layer.inited) {
		console.warn('can not call toWorldPosition until layer is inited')
		return
	}

	const worldMatrix = getWorldMatrix(layer) as number[]
	const projection = layer.resolveProjection() as Projection
	const matrix4 = _mat4.fromArray(worldMatrix)
	const pos = _vec3.fromArray(projection.project(lng, lat, alt))
	pos.applyMatrix4(matrix4)
	return pos
}

/**
 * 获取经纬度对应的屏幕坐标
 *
 * @param {number} lng
 * @param {number} lat
 * @param {number} [alt=0]
 * @return {*}  {(Vector2 | undefined)}
 * If the layer has no projection,
 * or a worldMatrix, or not added to any Polaris yet,
 * an {undefined} result will be returned.
 * @memberof StandardLayer
 *
 * @note return undefined if not inited
 */
export function toScreenXY(
	layer: StandardLayer,
	lng: number,
	lat: number,
	alt = 0
): Vector2 | undefined {
	if (!layer.inited) {
		console.warn('can not call toScreenXY until layer is inited')
		return
	}

	const polaris = layer['polaris']

	const worldPos = toWorldPosition(layer, lng, lat, alt)
	if (!worldPos) return

	const screenXY = polaris.getScreenXY(worldPos.x, worldPos.y, worldPos.z)
	if (!screenXY) return

	const xy = _vec2.fromArray(screenXY)

	// Align to html dom x/y
	xy.y = polaris.height - xy.y

	return xy
}

/**
 * Temp vars
 */
const _mat4 = new Matrix4()
const _vec3 = new Vector3()
const _vec2 = new Vector2()
