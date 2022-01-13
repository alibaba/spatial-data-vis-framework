/**
 * Copyright (C) 2022 Alibaba Group Holding Limited
 * All rights reserved.
 *
 * @class AbstractNode
 * @description An abstract tree structure based on EventDispatcher.
 * @author Simon
 */

import { EventDispatcher, EventOptions } from './EventDispatcher'

/**
 * Tree structure
 * @note handles tree context
 */
export class AbstractNode<
	TEventTypes extends {
		/**
		 * event after this node is added to another node
		 */
		add: { parent: AbstractNode<TEventTypes> }
		remove: { parent: AbstractNode<TEventTypes> }
		rootChange: { root: AbstractNode<TEventTypes> | null }
	}
> extends EventDispatcher<TEventTypes> {
	readonly isAbstractNode = true

	/**
	 * has this node been added and removed before
	 * @note currently not support re-add an used node
	 */
	private _removed = false
	private _root: null | AbstractNode<TEventTypes> = null
	private _parent: null | AbstractNode<TEventTypes> = null
	private _children = new Set<AbstractNode<TEventTypes>>()

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

	add(child: AbstractNode<TEventTypes>): void {
		if (this.children.has(child)) {
			console.warn('This node has already been added.')
			return
		}
		if (child._removed) {
			console.warn(
				`This node has already been removed before. It not supported to re-use node currently.`
			)
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

	remove(child: AbstractNode<TEventTypes>): void {
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

	traverse(handler: (node: AbstractNode<TEventTypes>) => void): void {
		handler(this)
		this.children.forEach((child) => child.traverse(handler))
	}

	/**
	 * override {@link EventDispatcher.addEventListener} to handle `add` event
	 * @note `add` event will be emitted immediately if parent already exists.
	 */
	addEventListener<TEventTypeName extends keyof TEventTypes>(
		/**
		 * type of the event
		 */
		type: TEventTypeName,
		/**
		 * callback function for the event
		 */
		listener: (
			/**
			 * emitted event.
			 */
			event: TEventTypes[TEventTypeName] & {
				target: any // self
				type: TEventTypeName
			}
		) => void,
		/**
		 * An object that specifies characteristics about the event listener
		 */
		options?: EventOptions
	): void {
		super.addEventListener(type, listener, options)

		if (type === 'add' && this.parent) {
			// @note this is serious, will emit all add event, when only itself should be emitted
			// this.dispatchEvent({ type: 'add', target: this, parent: this.parent })
			this.dispatchAnEvent<'add'>(
				{ type: 'add', target: this, parent: this.parent },
				listener as any
			)
		}
	}
}

// test code
// const a = new AbstractNode()
// a.addEventListener('add', (event) => {
// 	event.target
// })
// a.addEventListener('rootChange', (event) => {})
// a.addEventListener('ccc', (e) => {})
// a.addEventListener('')
