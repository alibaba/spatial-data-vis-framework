import { widthHooks, useProps } from '../src/PropsHooks'

/**
 * React to props changes like React-hooks
 *
 * The problems are actually same as react-hooks:
 * * Just like react-hooks, callback functions are redefined every time when setProps being called.
 * 	- React.js doesn't care {@link https://reactjs.org/docs/hooks-faq.html#are-hooks-slow-because-of-creating-functions-in-render}
 * * Just like react-hooks, hooks must be:
 * 	- used in specified functions (in our case, decorated methods)
 * 	- called in a static order. Using hooks in async/loop/condition is not allowed.
 * 	- {@link https://reactjs.org/docs/hooks-rules.html}
 */

export interface AProps {
	a: number
	aa: boolean
}

export class LayerA {
	constructor(initialProps: AProps) {
		// ...
		// init props
		this.setProps(initialProps)
	}

	@widthHooks
	setProps(props: Partial<AProps>) {
		useProps(() => {
			console.log('LayerA: changed, props.a: ' + props.a)
		}, [props.a])
	}
}

export interface BProps extends AProps {
	b: number
	bb: boolean
}

export class LayerB extends LayerA {
	constructor(initialProps: BProps) {
		super(initialProps)
	}

	@widthHooks
	setProps(props: Partial<BProps>) {
		super.setProps(props)

		useProps(() => {
			console.log(`LayerB: changed, a: ${props.a}, b: ${props.b}`)
		}, [props.a, props.b])
	}
}
