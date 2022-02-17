/**
 * Copyright (C) 2022 Alibaba Group Holding Limited
 * All rights reserved.
 *
 * @author Simon
 * @class AbstractNode
 * @description
 *
 * An abstract tree structure based on EventDispatcher.
 *
 * The tree constructed with AbstractNode is designed to be a "scene graph" :
 * - N-ary(多叉树), a node can have multiple children.
 * - directed(有向), from root to leaf.
 * - acyclic(无环), no loop.
 * - rooted(有单一根), every node has only one parent
 *
 * Also you can not re-use a removed node or change its position.
 */

/**
 * @loop_detection
 * Since we do not allow a node has multiple parents. The only scenario of loop
 * is when the root is added to a inode/leaf of the tree.
 *
 * @example
 *
 * root.add(inode)
 * inode.add(leaf)
 * leaf.add(inode) // error
 * leaf.add(root) // loop
 * inode.add(root) // loop
 */

import { EventDispatcher } from './EventDispatcher'

import type { AbstractNodeEvents } from './events'

/**
 * @explain ### Why not using `this` as the type of `parent`?
 *
 * > `this` as a type, will always refer to the subclass.
 * > While `parent` doesn't have to be the same subclass with this.
 *
 * Technically. Anything extending AbstractNode can be added to the node-tree.
 * LayerA->parent doesn't have to be an instance of LayerA.
 * It can be an instance of LayerB, or Polaris, or some wried stuff used as a container.
 *
 * If a system needs all the nodes fit into a specific sub-class.
 * (Like Polaris.gl needs every node to be either Layer or Polaris, instead of AbstractNode)
 * It should add constrains in sub-class. With following principles:
 *
 * - AbstractNode shouldn't mind logics of its sub-classes.
 * - For parent/child/root, use specific class instead of `this`.
 * - Only use `this` if it's actually about itself.
 *
 * The underlying problem of this:
 * - This kind of feature should be implemented with mixins.
 */

/**
 * the max depth of the tree
 */
const MAX_DEPTH = 1024

/**
 * Tree structure
 * @note handles tree context
 */
export class AbstractNode<
	TEventMap extends AbstractNodeEvents = AbstractNodeEvents
> extends EventDispatcher<TEventMap> {
	/**
	 * parent node
	 * @readonly
	 */
	get parent() {
		return this.#parent
	}

	/**
	 * children nodes
	 * @readonly
	 */
	get children() {
		return this.#children
	}

	/**
	 * root node of the tree
	 * @readonly
	 */
	get root() {
		return this.#root
	}

	add(child: AbstractNode): void {
		if (child.parent) {
			throw new Error(`AbstractNode: This child already has a parent.`)
		}
		// @note If changing parent is not allowed. This would be redundant,
		// if (this.children.has(child)) {
		// 	throw new Error(`AbstractNode: This child has already been added to current node.`)
		// }
		if (child.#removed) {
			throw new Error(`AbstractNode: This node has already been removed before. Do not re-use.`)
		}
		if (child === this) {
			throw new Error(`AbstractNode: A node cannot be added to itself.`)
		}

		// loop detection.
		if (this.root === child) {
			throw new Error(`AbstractNode: A loop is detected.`)
		}

		// depth detection
		let depth = 0
		let ancestor = this as AbstractNode | null
		while (ancestor) {
			ancestor = ancestor.parent
			depth++

			if (depth > MAX_DEPTH) {
				throw new Error(`AbstractNode: Max tree depth exceeded. (${MAX_DEPTH})`)
			}
		}

		this.children.add(child)

		child.#parent = this

		// emit `add` before `rootChange`
		child.dispatchEvent({ type: 'add', parent: this })

		// update root and emit `rootChange`
		// find root and assign to all children
		const root = this.root || this
		this.traverse((node) => {
			// skip current node
			if (node !== this) {
				node.#root = root
				// emit event from parent node
				node.dispatchEvent({ type: 'rootChange', root })
			}
		})
	}

	remove(child: AbstractNode): void {
		this.children.delete(child)

		child.#parent = null
		child.#root = null

		// emit `remove` on child
		child.dispatchEvent({ type: 'remove', parent: this })

		// update root and emit `rootChange`
		child.dispatchEvent({ type: 'rootChange', root: null })

		// find root and assign to all children
		const root = child
		child.traverse((node) => {
			// skip current node
			if (node !== child) {
				node.#root = root
				// emit event from parent node
				node.dispatchEvent({ type: 'rootChange', root })
			}
		})
	}

	removeAll(): void {
		for (const child of this.children) {
			this.remove(child)
		}
	}

	// traverse<TNode extends AbstractNode>(handler: (node: TNode) => void): void {
	traverse(handler: (node: AbstractNode) => void): void {
		handler(this as AbstractNode)
		this.children.forEach((child) => child.traverse(handler))
	}

	readonly isAbstractNode = true

	/**
	 * has this node been added and removed before
	 * @note currently not support re-add an used node
	 */
	#removed = false
	#root: null | AbstractNode = null
	#parent: null | AbstractNode = null
	#children = new Set<AbstractNode>()

	/**
	 * callback when object/layer is added to a parent
	 * @note different from addEventListener('add'), this will be triggered if the layer is already added to a parent
	 */
	set onAdd(f: (parent: AbstractNode) => void) {
		if (this.parent) {
			f(this.parent)
		} else {
			this.addEventListener(
				'add',
				(event) => {
					f(event.parent)
				},
				{ once: true }
			)
		}
	}

	/**
	 * @deprecated use {@link .addEventListener} instead
	 * callback when object/layer is removed from parent
	 */
	set onRemove(f: (parent) => void) {
		this.addEventListener(
			'remove',
			(event) => {
				f(event.parent)
			},
			{ once: true }
		)
	}
}

export function isAbstractNode(v: any): v is AbstractNode {
	return v.isEventDispatcher && v.isAbstractNode
}
export function isRootNode(v: AbstractNode) {
	return v.parent === null
}
export function isLeafNode(v: AbstractNode) {
	return v.children.size === 0
}

// test code
// const a = new AbstractNode()
// a.addEventListener('add', (event) => {
// 	event.target
// })
// a.addEventListener('rootChange', (event) => {})
// a.addEventListener('ccc', (e) => {})
// a.addEventListener('')
