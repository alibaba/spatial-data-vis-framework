import { PropsManager } from '../src/PropsManager'

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

// do not export this
const propsManagerA = Symbol('PropsManager4LayerA')

export class LayerA {
	// 🌟
	[propsManagerA] = new PropsManager<AProps, AModifiableProps>()

	constructor(initialProps: AProps) {
		// self init

		// listen
		this[propsManagerA].listen(['a'], (e) => {
			console.log('LayerA: changed', e.changedKeys)
		})

		// init props
		this[propsManagerA].set(initialProps)
	}
	setProps(props: Partial<Pick<AProps, AModifiableProps>>) {
		this[propsManagerA].set(props)
	}

	dispose() {
		console.log('LayerA: disposed', this[propsManagerA].dispose())
	}
}

export interface BProps extends AProps {
	b: number
	bb: boolean
}
export type BModifiableProps = 'b' | AModifiableProps

const propsManagerB = Symbol('PropsManager4LayerB')

export class LayerB extends LayerA {
	// 🌟
	[propsManagerB] = new PropsManager<BProps, BModifiableProps>()

	constructor(initialProps: BProps) {
		// super
		super(initialProps)

		// self init

		// listen
		this[propsManagerB].listen(['b'], (e) => {
			console.log('LayerB: changed', e.changedKeys)
		})

		// init props
		this[propsManagerB].set(initialProps)
	}

	setProps(props: Partial<Pick<BProps, BModifiableProps>>) {
		/**
		 * @note this checked twice
		 */
		super.setProps(props)
		this[propsManagerB].set(props)
	}

	dispose() {
		super.dispose()
		console.log('LayerB: disposed', this[propsManagerB].dispose())
	}
}
