/**
 * Copyright (C) 2022 Alibaba Group Holding Limited
 * All rights reserved.
 *
 * @class AbstractNode
 * @description An abstract tree structure based on EventDispatcher.
 * @author Simon
 */

import { EventDispatcher } from './EventDispatcher'

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

type Events = {
	add: { parent: AbstractNode }
	remove: { parent: AbstractNode }
	rootChange: { root: AbstractNode | null }
}

// let a : Events
// a.add.parent

/**
 * Tree structure
 * @note handles tree context
 */
export class AbstractNode extends EventDispatcher {
	declare EventTypes: Events

	/**
	 * has this node been added and removed before
	 * @note currently not support re-add an used node
	 */
	private _removed = false
	private _root: null | AbstractNode = null
	private _parent: null | AbstractNode = null
	private _children = new Set<AbstractNode>()

	/**
	 * parent node
	 * @readonly
	 */
	get parent() {
		return this._parent
	}

	/**
	 * children nodes
	 * @readonly
	 */
	get children() {
		return this._children
	}

	/**
	 * root node of the tree
	 * @readonly
	 */
	get root() {
		return this._root
	}

	add(child: AbstractNode): void {
		if (this.children.has(child)) {
			console.warn('This node has already been added.')
			return
		}
		if (child._removed) {
			console.warn(`This node has already been removed before. Do not re-use.`)
			return
		}

		this.children.add(child)

		if (child.parent) {
			console.warn('This node already has a parent.')
			child.parent.remove(child)
		}
		child._parent = this

		// emit `add` before `rootChange`

		child.dispatchEvent({ type: 'add', parent: this })

		// update root and emit `rootChange`

		// find root and assign to all children
		const root = this.root || this
		this.traverse((node) => {
			// skip current node
			if (node !== this) {
				node._root = root
				// emit event from parent node
				node.dispatchEvent({ type: 'rootChange', root })
			}
		})
	}

	remove(child: AbstractNode): void {
		this.children.delete(child)

		// emit `remove` on child

		child._parent = null
		child.dispatchEvent({ type: 'remove', parent: this })

		// update root and emit `rootChange`

		child._root = null
		child.dispatchEvent({ type: 'rootChange', root: null })

		// find root and assign to all children
		const root = child
		child.traverse((node) => {
			// skip current node
			if (node !== child) {
				node._root = root
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
}

// test code
// const a = new AbstractNode()
// a.addEventListener('add', (event) => {
// 	event.target
// })
// a.addEventListener('rootChange', (event) => {})
// a.addEventListener('ccc', (e) => {})
// a.addEventListener('')
