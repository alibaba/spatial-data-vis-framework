import { EventDispatcher } from '../src/EventDispatcher'
import { AbstractNode } from '../src/AbstractNode'
import { AbstractLayer } from '../src/AbstractLayer'

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

test('AbstractLayer', () => {
	type Props = {
		parent?: AbstractLayer
		name: string
		aa: number
		bb?: boolean
		cc?: boolean
	}
	class L extends AbstractLayer<Props> {
		constructor(initialProps: Props) {
			super()

			this.setProps(initialProps)

			this.watchProps(
				['aa', 'cc'],
				(e) => {
					console.log(this.getProp('name'), `: aa or cc changed (immediate fired)`)
				},
				{ immediate: true }
			)

			this.watchProp('aa', (e) => {
				console.log(this.getProp('name'), ': aa changed', this.getProp('aa'))
			})

			this.watchProps(['aa', 'bb'], (e) => {
				console.log(
					this.getProp('name'),
					': aa or bb changed',
					this.getProp('aa'),
					this.getProp('bb')
				)
			})

			this.watchProps(['parent', 'name'], (e) => {
				console.error('Do not modify static props')
			})

			this.addEventListener('visibilityChange', (e) => {
				console.log('visibilityChange', e)
			})
		}
		dispose() {}
	}

	const root = new L({
		name: 'root',
		aa: 1,
	})

	const leaf = new L({
		name: 'leaf',
		aa: 2,
	})

	// root.setProps({ name: 'hacked' }) // log error

	root.setProps({
		aa: 3,
	})
	root.setProps({
		aa: 3,
	})
	root.setProps({
		aa: 4,
	})
	leaf.setProps({
		bb: false,
	})
	leaf.setProps({
		bb: true,
	})
	leaf.setProps({
		bb: undefined,
	})

	console.log('show')
	root.show()

	console.log('hide')
	root.hide()

	console.log('hide')
	root.hide()

	console.log('show')
	root.show()

	console.log('visible = false')
	root.visible = false
})

// ===

function test(name: string, fun: () => void) {
	console.group(name)
	fun()
	console.groupEnd()
}

type A = { aa: number }
// type B = {} extends A ? true : false // false
// type B = {aa: number} extends A ? true : false // true
// type B = {aa: boolean} extends A ? true : false // false
// type B = {aa?: number} extends A ? true : false // false
// type B = {aa?: number} extends Partial<A> ? true : false // true
// type B = {aa: number} extends Partial<A> ? true : false // true
type B = {} extends Partial<A> ? true : false // true
