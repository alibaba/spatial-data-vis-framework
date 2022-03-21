import * as SDK from '@gs.i/frontend-sdk'
import * as IR from '@gs.i/schema-scene'

/**
 * 对输入的mesh对象生成一个浅拷贝并返回，新的对象不包含parent和children，
 * @note geometry和material会共用原本对象的引用，不会创建新的实例
 * @note 效果类似于 instance，marker 应该考虑用 instance 替代
 *
 * @param mesh
 * @returns {} Mesh
 */
export function cloneMesh(mesh: IR.NodeLike): IR.NodeLike {
	if (IR.isRenderable(mesh)) {
		return {
			name: mesh.name,
			visible: mesh.visible,
			geometry: mesh.geometry,
			material: mesh.material,
			extensions: mesh.extensions,
			transform: mesh.transform, // @note 全部浅拷贝
			// 去掉parent和children
			children: new Set<IR.MeshDataType>(),
			parent: undefined,
		}
	} else {
		return {
			name: mesh.name,
			visible: mesh.visible,
			extensions: mesh.extensions,
			transform: mesh.transform, // @note 全部浅拷贝
			// 去掉parent和children
			children: new Set<IR.MeshDataType>(),
			parent: undefined,
		}
	}
}

/**
 * 对输入的mesh对象生成一个深拷贝并返回，新的对象不会有parent，@note geometry和material都会共用原本对象的引用，不会创建新的实例
 *
 * @param mesh
 * @returns {} Mesh
 */
export function deepCloneMesh(mesh: IR.NodeLike): IR.NodeLike {
	const res = cloneMesh(mesh)
	mesh.children.forEach((child) => {
		const clone = deepCloneMesh(child) as IR.MeshDataType
		res.children.add(clone)
		clone.parent = res
	})
	return res
}

/**
 * traverse a scene graph and process all the nodes
 * 默认使用深度优先前序遍历（最快）
 * Pre-Order Traversal
 * @param node
 * @param handler
 * @param parent
 */
export function traverse(
	node: IR.NodeLike,
	handler: (node: IR.NodeLike, parent?: IR.NodeLike) => any,
	parent?: IR.NodeLike
) {
	if (node === undefined || node === null) return

	handler(node, parent)

	// if (node.children && node.children.size > 0) {
	// 	node.children.forEach((child) => traverse(child, handler, node))
	// }

	// @note a little bit faster
	if (node.children)
		for (const child of node.children) {
			traverse(child, handler, node)
		}
}

export function earlyStopTraverse(
	node: IR.NodeLike,
	handler: (node: IR.NodeLike, parent?: IR.NodeLike) => boolean | undefined,
	parent?: IR.NodeLike
): boolean | undefined {
	if (node === undefined || node === null) return

	const shouldStop = handler(node, parent)
	if (shouldStop === true) return true

	// if (node.children && node.children.size > 0) {
	// 	node.children.forEach((child) => traverse(child, handler, node))
	// }

	// @note a little bit faster
	if (node.children)
		for (const child of node.children) {
			const shouldStop = earlyStopTraverse(child, handler, node)
			if (shouldStop === true) return true
		}

	return
}
