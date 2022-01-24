import React, { Children, cloneElement, createRef, PureComponent } from 'react'
import { TPolarisProps, PolarisProps, PolarisState } from './types'

export class PolarisReact extends PureComponent<TPolarisProps, PolarisState> {
	static defaultProps = new PolarisProps()

	refRoot: React.RefObject<any>

	constructor(props) {
		super(props)

		this.refRoot = createRef()

		this.state = new PolarisState()
	}

	componentDidMount() {
		this.init()
	}

	init = () => {
		const { width, height, PolarisClass, ...otherProps } = this.props

		if (!PolarisClass) {
			throw new Error(`PolarisReact - 'PolarisClass' must be provided`)
		}

		const polarisInstance = new PolarisClass({
			container: this.refRoot.current,
			width,
			height,
			...otherProps,
		})

		console.log('polarisInstance', polarisInstance)

		this.setState({
			polarisInstance,
		})
	}

	render() {
		const { children, width, height } = this.props

		return (
			<div
				ref={this.refRoot}
				style={{
					width,
					height,
				}}>
				{this.state.polarisInstance &&
					Children.map(children, (child) => {
						if (child === undefined || child === null) {
							return
						}
						return cloneElement(child as any, { polarisInstance: this.state.polarisInstance })
					})}
			</div>
		)
	}
}
