import { PropsManager } from '../src/PropsManager'
import { pick } from '../src/utils'

/**
 * PropsManager as a internal mechanism of setProps.
 *
 * This requires that PropsManager shall not be shared between parent and child classes.
 *
 * @note # private act like var in closure scope
 * @note can be replaced with symbol
 *
 * The problem of non-shared properties is that
 * everything is saved twice.
 *
 * The good news is that dirty-check only check listened keys.
 * So they won'y be checked twice. (Unless you actually listened a key in both classes)
 *
 * @note Separate props manually to prevent this problem.
 */

export interface AProps {
	a: number
	aa: boolean
}
export type AModifiableProps = 'a'

export class LayerA {
	// 🌟
	#propsManager = new PropsManager<AProps, AModifiableProps>()

	constructor(initialProps: AProps) {
		// self init

		// listen
		this.#propsManager.listen(['a'], (e) => {
			console.log('LayerA: changed', e.changedKeys)
		})

		// init props
		this.#propsManager.set(initialProps)
	}
	setProps(props: Partial<Pick<AProps, AModifiableProps>>) {
		this.#propsManager.set(props)
	}

	dispose() {
		console.log('LayerA: disposed', this.#propsManager.dispose())
	}
}

export interface BProps extends AProps {
	b: number
	bb: boolean
}
export type BModifiableProps = 'b' | AModifiableProps

export class LayerB extends LayerA {
	// 🌟
	#propsManager = new PropsManager<BProps, BModifiableProps>()

	constructor(initialProps: BProps) {
		// super
		// super(initialProps)
		super(pick(initialProps, ['a', 'aa']))

		// self init

		// listen
		this.#propsManager.listen(['b'], (e) => {
			console.log('LayerB: changed', e.changedKeys)
		})

		// init props
		this.#propsManager.set(initialProps)
	}

	setProps(props: Partial<Pick<BProps, BModifiableProps>>) {
		// super.setProps(props)
		super.setProps(pick(props, ['a']))
		this.#propsManager.set(props)
	}

	dispose() {
		super.dispose()
		console.log('LayerB: disposed', this.#propsManager.dispose())
	}
}
