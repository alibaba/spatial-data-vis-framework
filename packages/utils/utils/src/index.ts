/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Projection } from '@polaris.gl/projection'
import { Mesh } from '@gs.i/frontend-sdk'
import { MeshDataType, AttributeDataType, isDISPOSED } from '@gs.i/schema'
import { Vector3, Matrix3, Matrix4 } from '@gs.i/utils-math'
import { Transform3 } from '@gs.i/utils-transform'

export * from './constants'
export * as poly from './poly'
export * from './math'
export * from './capacity'
export * from './geometry'
export * from './helpers'

// 判断两个投影之间是否是可以通过简单变换得到的
export function isSimiliarProjections(p0: Projection, p1: Projection) {
	return (
		(p0.type === 'MercatorProjection' && p1.type === p0.type) ||
		(p0.isShpereProjection && p1.isShpereProjection) ||
		(p0.type === 'EquirectangularProjection' && p1.type === p0.type)
	)
}

export const partitionArray = (arr, predicate) =>
	arr.reduce(
		(r, o) => {
			r[+!!predicate(o)].push(o)
			return r
		},
		[[], []]
	)

// code from react-three-fiber
// @TODO 替换成 is.js
export const is = {
	obj: (a: any) => a === Object(a) && !is.arr(a),
	fun: (a: any) => typeof a === 'function',
	str: (a: any) => typeof a === 'string',
	num: (a: any) => typeof a === 'number',
	und: (a: any) => a === void 0,
	arr: (a: any) => Array.isArray(a),
	equ(a: any, b: any) {
		// Wrong type or one of the two undefined, doesn't match
		if (typeof a !== typeof b || !!a !== !!b) return false
		// Atomic, just compare a against b
		if (is.str(a) || is.num(a) || is.obj(a)) return a === b
		// Array, shallow compare first to see if it's a match
		if (is.arr(a) && a == b) return true
		// Last resort, go through keys
		let i
		for (i in a) if (!(i in b)) return false
		for (i in b) if (a[i] !== b[i]) return false
		return is.und(i) ? a === b : true
	},
}

/**
 * 对输入的mesh对象生成一个浅拷贝并返回，新的对象不包含parent和children，@note geometry和material会共用原本对象的引用，不会创建新的实例
 *
 * @param mesh
 * @returns {} Mesh
 */
export function cloneMesh(mesh: MeshDataType | Mesh): MeshDataType | Mesh {
	let res: MeshDataType
	if (mesh instanceof Mesh) {
		res = new Mesh()
		res.name = mesh.name
		res.visible = mesh.visible
		res.geometry = mesh.geometry
		res.material = mesh.material
		res.renderOrder = mesh.renderOrder
	} else {
		res = {
			name: mesh.name,
			visible: mesh.visible,
			geometry: mesh.geometry,
			material: mesh.material,
			renderOrder: mesh.renderOrder,
			transform: new Transform3(),
			// 去掉parent和children
			children: new Set<MeshDataType>(),
			parent: undefined,
		}
	}

	// 重置引用
	res.transform.matrix = Array.from(mesh.transform.matrix)
	res.transform.worldMatrix = mesh.transform.worldMatrix
		? Array.from(mesh.transform.worldMatrix)
		: undefined

	return res
}

/**
 * 对输入的mesh对象生成一个深拷贝并返回，新的对象不会有parent，@note geometry和material都会共用原本对象的引用，不会创建新的实例
 *
 * @param mesh
 * @returns {} Mesh
 */
export function deepCloneMesh(mesh: MeshDataType | Mesh): MeshDataType | Mesh {
	const res = cloneMesh(mesh)
	mesh.children.forEach((child) => {
		// SDK.Mesh 有 add 方法，Schema.MeshDataType 没有
		if (res instanceof Mesh) {
			res.add(deepCloneMesh(child) as Mesh)
		} else {
			const clone = deepCloneMesh(child) as MeshDataType
			res.children.add(clone)
			clone.parent = res
		}
	})
	return res
}

export function traverseMesh(mesh: MeshDataType, fn: (MeshDataType) => void) {
	fn(mesh)
	if (mesh.children.size) {
		mesh.children.forEach((child) => {
			traverseMesh(child, fn)
		})
	}
}

const _v1 = new Vector3()
export function applyMatrixToAttr(attr: AttributeDataType, matrix: Matrix3 | Matrix4) {
	if (isDISPOSED(attr.array)) {
		return
	}

	if (matrix.elements.length === 16) {
		for (let i = 0, l = attr.count; i < l; i++) {
			const idx = i * attr.itemSize

			_v1.x = attr.array[idx + 0]
			_v1.y = attr.array[idx + 1]
			_v1.z = attr.array[idx + 2]

			_v1.applyMatrix4(matrix as Matrix4)

			attr.array[idx + 0] = _v1.x
			attr.array[idx + 1] = _v1.y
			attr.array[idx + 2] = _v1.z
		}
	} else if (matrix.elements.length === 9) {
		for (let i = 0, l = attr.count; i < l; i++) {
			const idx = i * attr.itemSize

			_v1.x = attr.array[idx + 0]
			_v1.y = attr.array[idx + 1]
			_v1.z = attr.array[idx + 2]

			_v1.applyMatrix3(matrix as Matrix3)

			attr.array[idx + 0] = _v1.x
			attr.array[idx + 1] = _v1.y
			attr.array[idx + 2] = _v1.z
		}
	}
}

export function promiseAny<T>(values: Iterable<T | PromiseLike<T>>): Promise<T> {
	return new Promise<T>((resolve: (value: T) => void, reject: (reason?: any) => void): void => {
		let hasResolved = false
		let iterableCount = 0
		const promiseLikes: Array<T | PromiseLike<T>> = []
		const rejectionReasons: any[] = []

		function resolveOnce(value: T): void {
			if (!hasResolved) {
				hasResolved = true
				resolve(value)
			}
		}

		function rejectionCheck(reason?: any): void {
			rejectionReasons.push(reason)

			if (rejectionReasons.length >= iterableCount) reject(rejectionReasons)
		}

		for (const value of values) {
			iterableCount++
			promiseLikes.push(value)
		}

		for (const promiseLike of promiseLikes) {
			if (
				(promiseLike as PromiseLike<T>)?.then !== undefined ||
				(promiseLike as Promise<T>)?.catch !== undefined
			) {
				;(promiseLike as Promise<T>)
					?.then((result: T): void => resolveOnce(result))
					?.catch((error?: any): void => undefined)
				;(promiseLike as Promise<T>)?.catch((reason?: any): void => rejectionCheck(reason))
			} else resolveOnce(promiseLike as T)
		}
	})
}

export function colorToUint8Array(color: { r: number; g: number; b: number }, alpha?: number) {
	if (alpha !== undefined) {
		return new Uint8Array([
			Math.min(Math.round(color.r * 255.0), 255),
			Math.min(Math.round(color.g * 255.0), 255),
			Math.min(Math.round(color.b * 255.0), 255),
			Math.min(Math.round(alpha * 255.0), 255),
		])
	} else {
		return new Uint8Array([
			Math.min(Math.round(color.r * 255.0), 255),
			Math.min(Math.round(color.g * 255.0), 255),
			Math.min(Math.round(color.b * 255.0), 255),
		])
	}
}
