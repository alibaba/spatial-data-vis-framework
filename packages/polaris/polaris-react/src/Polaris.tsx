import React, { Children, cloneElement, createRef, PureComponent } from 'react'
import { PolarisProps, PolarisState } from './types'

export class PolarisReact extends PureComponent<PolarisProps, PolarisState> {
	refRoot: React.RefObject<any>

	constructor(props) {
		super(props)

		this.refRoot = createRef()

		this.state = new PolarisState()
	}

	componentDidMount() {
		this.init()
	}

	init() {
		const { polarisClass, getPolarisInstance, ...otherProps } = this.props

		if (!polarisClass) {
			throw new Error(`PolarisReact - prop 'polarisClass' must be provided`)
		}

		const polarisInstance = new polarisClass({
			container: this.refRoot.current,
			...otherProps,
		})

		if (getPolarisInstance) {
			getPolarisInstance(polarisInstance)
		}

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
						// pass polarisInstance to child components
						return cloneElement(child as any, { polarisInstance: this.state.polarisInstance })
					})}
			</div>
		)
	}
}
