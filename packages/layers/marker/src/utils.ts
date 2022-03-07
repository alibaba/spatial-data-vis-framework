import { Mesh } from '@gs.i/frontend-sdk'
import { MeshDataType } from '@gs.i/schema'

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
