import { EventDispatcher } from '../src/EventDispatcher'
import { AbstractNode } from '../src/AbstractNode'
import { AbstractLayer } from '../src/AbstractLayer'
import { Layer, LayerProps } from '../src/Layer'
import { Projection } from '@polaris.gl/projection'
import { Timeline } from 'ani-timeline'
import { AbstractPolaris, PolarisProps } from '../src/Polaris'

await test(false, 'EventDispatcher', () => {
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

await test(false, 'AbstractNode', () => {
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

await test(false, 'AbstractLayer', () => {
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

await test(false, 'AbstractPolaris', () => {
	class L extends AbstractPolaris {
		constructor(initialProps: PolarisProps) {
			super(initialProps)

			this.watchProps(
				['width', 'height'],
				(e) => {
					console.log(`width or height changed (immediate fired)`, e.props)
				},
				{ immediate: true }
			)

			this.watchProp('zoom', (e) => {
				console.log('zoom changed', this.getProp('zoom'))
			})

			this.watchProps(['zoomLimit', 'pitchLimit'], (e) => {
				console.log(
					'zoomLimit or pitchLimit changed',
					this.getProp('zoomLimit'),
					this.getProp('pitchLimit')
				)
			})

			this.addEventListener('visibilityChange', (e) => {
				console.log('visibilityChange', e)
			})

			this.addEventListener('viewChange', (e) => {
				console.log('viewChange', e)
			})
		}
		capture() {
			throw new Error('not implemented')
			return `not implemented`
		}
		render() {
			console.log('.render called')
		}
		getScreenXY(x: number, y: number, z: number) {
			throw new Error('not implemented')
			return [0, 0]
		}
		dispose() {}
	}

	const p = new L({
		container: document.querySelector('#container') as HTMLDivElement,
	})

	p.setProps({ width: 100 })

	p.timeline.updateMaxFPS(1)

	p.setProps({ timeline: undefined }) // nothing will happen because props are incremental
	console.log('timeline:', p.timeline)
	// p.setProps({ timeline: null }) // log error

	console.log('p.parent', p.parent)
	console.log('p.root', p.root)
	console.log('p.children', p.children)

	p.setProps({ width: 100 }) // nothing
	p.setProps({ width: 100 }) // nothing
	p.setProps({ width: 200 }) // width/height props listener

	setTimeout(() => p.setProps({ width: 300 })) // viewChange & props listener
})

await test(true, 'Polaris+Layer', () => {
	type Props = LayerProps & {
		aa: number
		bb?: boolean
		cc?: boolean
	}
	class L extends Layer<Props> {
		constructor(initialProps: Props) {
			super(initialProps)
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
				console.log(`${this.name}`, 'visibilityChange', e)
			})

			/**
			 * this will be missed if parent is input as a props
			 */
			this.addEventListener('add', (e) => {
				console.log(`${this.name}`, 'add, as a listener', e)
			})

			/**
			 * this won't be missed
			 */

			this.onAdd = (parent) => {
				console.log(`${this.name}`, 'add, as onAdd', parent)
			}
		}
		init(projection: Projection, timeline: Timeline, polaris: AbstractPolaris) {
			console.log(`${this.name} init method`, projection, timeline, polaris)
		}
		dispose() {}
	}
	const inode = new L({
		name: 'inode',
		aa: 1,
	})
	const leaf = new L({
		name: 'leaf',
		aa: 2,
		parent: inode,
	})

	class P extends AbstractPolaris {
		constructor(initialProps: PolarisProps) {
			super(initialProps)

			this.watchProps(
				['width', 'height'],
				(e) => {
					console.log(`polaris: width or height changed (immediate fired)`, e.props)
				},
				{ immediate: true }
			)

			this.watchProp('zoom', (e) => {
				console.log('zoom changed', this.getProp('zoom'))
			})

			this.watchProps(['zoomLimit', 'pitchLimit'], (e) => {
				console.log(
					'zoomLimit or pitchLimit changed',
					this.getProp('zoomLimit'),
					this.getProp('pitchLimit')
				)
			})

			this.addEventListener('visibilityChange', (e) => {
				console.log('visibilityChange', e)
			})

			this.addEventListener('viewChange', (e) => {
				console.log('viewChange', e)
			})
		}
		capture() {
			throw new Error('not implemented')
			return `not implemented`
		}
		render() {
			console.log('.render called')
		}
		getScreenXY(x: number, y: number, z: number) {
			throw new Error('not implemented')
			return [0, 0]
		}
		dispose() {}
	}

	const p = new P({
		container: document.querySelector('#container') as HTMLDivElement,
	})

	p.timeline.updateMaxFPS(1)

	p.add(inode)
})

// ===

async function test(enable: boolean, name: string, fun: () => void, duration = 1000) {
	if (!enable) return
	console.group(name)
	fun()
	await new Promise((resolve, reject) => {
		setTimeout(() => resolve(true), duration)
	})
	console.log(`test end (${name})`)
	console.groupEnd()
	return
}

type A = { aa: number }
// type B = {} extends A ? true : false // false
// type B = {aa: number} extends A ? true : false // true
// type B = {aa: boolean} extends A ? true : false // false
// type B = {aa?: number} extends A ? true : false // false
// type B = {aa?: number} extends Partial<A> ? true : false // true
// type B = {aa: number} extends Partial<A> ? true : false // true
type B = {} extends Partial<A> ? true : false // true
