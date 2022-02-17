import { EventDispatcher } from '../src/EventDispatcher'
import { AbstractNode } from '../src/AbstractNode'

test('EventDispatcher', () => {
	type Events = {
		a: { type: 'a'; data: number }
		b: { type: 'b'; data: boolean }
	}
	const d = new EventDispatcher<Events>()

	console.log(d)
	globalThis.d = d

	d.addEventListener('a', (e) => {
		console.log('event a', e)
	})
	d.addEventListener(
		'b',
		(e) => {
			console.log('event b (once)', e)
		},
		{ once: true }
	)

	d.dispatchEvent({ type: 'a', data: 123 })
	d.dispatchEvent({ type: 'a', data: 234 })

	d.dispatchEvent({ type: 'b', data: true })
	d.dispatchEvent({ type: 'b', data: false })
	d.dispatchEvent({ type: 'b', data: false })
})

test('AbstractNode', () => {
	const root = new AbstractNode()

	console.log('root', root)
	globalThis.root = root

	root.addEventListener('add', (e) => {
		console.log('root: event add (1/2 listeners)', e)
	})
	root.addEventListener('add', (e) => {
		console.log('root: event add (2/2 listeners)', e)
	})
	root.addEventListener('remove', (e) => {
		console.log('root: event remove', e)
	})
	root.addEventListener('rootChange', (e) => {
		console.log('root: event rootChange', e)
	})

	const inode = new AbstractNode()
	inode.addEventListener('add', (e) => {
		console.log('inode: event add (1/2 listeners)', e)
	})
	inode.addEventListener('add', (e) => {
		console.log('inode: event add (2/2 listeners)', e)
	})
	inode.addEventListener('remove', (e) => {
		console.log('inode: event remove', e)
	})
	inode.addEventListener('rootChange', (e) => {
		console.log('inode: event rootChange', e)
	})

	const leaf = new AbstractNode()
	leaf.addEventListener('add', (e) => {
		console.log('leaf: event add (1/2 listeners)', e)
	})
	leaf.addEventListener('add', (e) => {
		console.log('leaf: event add (2/2 listeners)', e)
	})
	leaf.addEventListener('remove', (e) => {
		console.log('leaf: event remove', e)
	})
	leaf.addEventListener('rootChange', (e) => {
		console.log('leaf: event rootChange', e)
	})

	inode.add(leaf)
	// leaf.add(leaf) // throw: `A node cannot be added to itself.`
	// leaf.add(inode) // throw: `A loop is detected.`
	// root.add(leaf) // throw: `This child already has a parent.`
	root.add(inode)
	// root.add(inode) // throw: `This child already has a parent.`
})

// ===

function test(name: string, fun: () => void) {
	console.group(name)
	fun()
	console.groupEnd()
}
