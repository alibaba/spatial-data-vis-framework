import React, { Children, cloneElement, createRef, PureComponent } from 'react'
import { PolarisProps, PolarisState } from './types'

export class PolarisReact extends PureComponent<PolarisProps, PolarisState> {
	static defaultProps = {
		width: 500,
		height: 500,
	}

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
		const { width, height, PolarisClass } = this.props

		const polarisInstance = new PolarisClass({
			container: this.refRoot.current,
			width,
			height,
		})

		console.log('polarisInstance', polarisInstance)

		this.setState({
			polarisInstance,
		})
	}

	render() {
		const { children } = this.props

		return (
			<div ref={this.refRoot}>
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
