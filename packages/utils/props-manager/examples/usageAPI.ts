import { PropsManager } from '../src/PropsManager'

/**
 * PropsManager as standard API.
 */

export interface AProps {
	a: number
	aa: boolean
}
export type AModifiableProps = 'a'

export class LayerA<
	TProps extends Record<string, any> = {},
	TModifiableKeys extends keyof TProps = keyof TProps
> {
	protected propsManager = new PropsManager<TProps & AProps, TModifiableKeys | AModifiableProps>()

	constructor(initialProps: TProps & AProps) {
		// ...

		// init props
		this.propsManager.set(initialProps)

		// listen
		this.propsManager.listen(
			['a'],
			(e) => {
				console.log('LayerA: changed', e.changedKeys)
			},
			true
		)
	}
	setProps(props: Partial<Pick<TProps & AProps, TModifiableKeys | AModifiableProps>>) {
		this.propsManager.set(props)
	}

	dispose() {
		console.log('LayerA: disposed', this.propsManager.dispose())
	}
}

export interface BProps extends AProps {
	b: number
	bb: boolean
}
export type BModifiableProps = 'b' | AModifiableProps

export class LayerB extends LayerA<BProps, BModifiableProps> {
	constructor(initialProps: BProps) {
		// super
		super(initialProps)

		// ...

		// listen
		this.propsManager.listen(
			['b', 'a'],
			(e) => {
				console.log('LayerB: changed', e.changedKeys)
			},
			true
		)
	}
}
