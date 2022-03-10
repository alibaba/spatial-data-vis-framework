import {
	PropsManager,
	widthHooks,
	useProps,
	ListenerOptions,
	Callback,
	getPropsManager,
	disposePropsManager,
} from '../src/index'

/**
 * Use together
 */

/**
 * base class
 */

export interface PropsA {
	a: number
	aa: boolean
}
export type ModifiablePropsA = 'a'

export class LayerA<
	TProps extends Record<string, any> = Record<string, never>,
	TModifiableKeys extends keyof TProps = keyof TProps
> {
	// #region props manager

	/**
	 * powering the `watchProps` method of this class.
	 */
	#propsManager = new PropsManager<TProps & PropsA, TModifiableKeys | ModifiablePropsA>()
	#props = new Proxy(Object.freeze({}) as Partial<TProps & PropsA>, {
		// @note use arrow function to get the private PropsManager
		get: (target, propertyName, receiver) => {
			return this.#propsManager.get(propertyName as any)
		},
		set: () => {
			throw new Error('Do not edit props directly. Use setProps instead.')
		},
	})

	/**
	 * a read only props getter
	 */
	get props() {
		return this.#props
	}

	protected watchProps<TKeys extends Array<TModifiableKeys | ModifiablePropsA>>(
		keys: TKeys,
		callback: Callback<TProps & PropsA, TKeys[number]>,
		options?: ListenerOptions
	): void {
		this.#propsManager.addListener(keys, callback, options)
	}

	public setProps(props: Partial<Pick<TProps & PropsA, TModifiableKeys | ModifiablePropsA>>) {
		this.#propsManager.set(props)
	}

	protected getProp(key: keyof TProps | keyof PropsA) {
		return this.#propsManager.get(key)
	}

	// #endregion

	constructor(initialProps: TProps & PropsA) {
		// ...

		// init props
		this.setProps(initialProps)

		this.watchProps(
			['a'],
			(e) => {
				console.log('LayerA: changed', e.changedKeys)
			},
			true
		)
	}

	dispose() {
		console.log('LayerA: disposed', this.#propsManager.dispose())
	}
}

/**
 * API usage
 */

export interface PropsB extends PropsA {
	b: number
	bb: boolean
}
export type ModifiablePropsB = 'b' | ModifiablePropsA

export class LayerB extends LayerA<PropsB, ModifiablePropsB> {
	constructor(initialProps: PropsB) {
		super(initialProps)

		this.watchProps(
			['b', 'a'],
			(e) => {
				console.log('LayerB: changed', e.changedKeys)
			},
			true
		)
	}
}

/**
 * private usage
 */

export interface PropsC extends PropsB {
	c: number
	cc: boolean
}
const modifiablePropsC = ['c' as const]
export type ModifiablePropsC = typeof modifiablePropsC[number] | ModifiablePropsB

/**
 * @note this do not work because LayerA.constructor called this.setProps,
 * which refer to LayerC.setProps,
 * which rely on LayerC.#propsManager,
 * which is not yet defined until LayerA.constructor finished.
 */
// export class LayerC extends LayerB {
// 	#propsManager = new PropsManager<PropsC, ModifiablePropsC>()
// 	constructor(initialProps: PropsC) {
// 		super(initialProps)
// 		// listen
// 		this.#propsManager.listen(
// 			['c'],
// 			(e) => {
// 				console.log('LayerB: changed', e.changedKeys)
// 			},
// 			true
// 		)
// 	}
// 	override setProps(props: Partial<Pick<PropsC, ModifiablePropsC>>): void {
// 		/**
// 		 * @note copy new props to inherited manager and private manager
// 		 * but only trigger on of them to do dirty-checking
// 		 */
// 		super.setProps(props)
// 		this.#propsManager.set(props)
// 	}
// 	override getProp(key: keyof PropsC) {
// 		return this.#propsManager.get(key)
// 	}
// 	//
// 	override dispose(): void {
// 		this.#propsManager.dispose()
// 		super.dispose()
// 	}
// }

export class LayerC extends LayerB {
	constructor(initialProps: PropsC) {
		super(initialProps)
		// listen
		getPropsManager<PropsC, ModifiablePropsC>(this).listen(
			['c'],
			(e) => {
				console.log('LayerC: changed', e.changedKeys)
			},
			true
		)
	}
	override setProps(props: Partial<Pick<PropsC, ModifiablePropsC>>): void {
		/**
		 * @note copy new props to inherited manager and private manager
		 * but only trigger on of them to do dirty-checking
		 */
		super.setProps(props)
		getPropsManager<PropsC, ModifiablePropsC>(this).set(props)
	}
	override getProp(key: keyof PropsC) {
		return getPropsManager<PropsC, ModifiablePropsC>(this).get(key)
	}
	//
	override dispose(): void {
		disposePropsManager(this)
		super.dispose()
	}
}

/**
 * hooks usage
 */

export interface PropsD extends PropsC {
	d: number
	dd: boolean
}
const modifiablePropsD = ['d' as const]
export type ModifiablePropsD = typeof modifiablePropsD[number] | ModifiablePropsC

export class LayerD extends LayerC {
	constructor(initialProps: PropsD) {
		super(initialProps)
	}

	@widthHooks
	override setProps(props: Partial<Pick<PropsD, ModifiablePropsD>>): void {
		super.setProps(props)

		useProps(() => {
			console.log('LayerD: d changed')
		}, [props.d])
	}
}
