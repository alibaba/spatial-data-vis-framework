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

	componentWillUnmount() {
		if (this.state.polarisInstance) {
			this.state.polarisInstance.dispose()
		}
	}

	componentDidUpdate() {
		if (this.isCameraStatusChanged()) {
			this.updateCameraStatus()
		}
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

		// cache camera status to automatically update statesCode when they are changed
		const center = otherProps.center || this.state.center
		const pitch = otherProps.pitch || this.state.pitch
		const rotation = otherProps.rotation || this.state.rotation
		const zoom = otherProps.zoom || this.state.zoom
		this.setState({
			polarisInstance,
			center,
			pitch,
			rotation,
			zoom,
		})
	}

	private isCameraStatusChanged() {
		const { center, zoom, pitch, rotation } = this.props
		if (
			center &&
			(center[0] !== this.state.center[0] ||
				center[1] !== this.state.center[1] ||
				center[2] !== this.state.center[2])
		) {
			return true
		}

		if (zoom !== undefined && zoom !== this.state.zoom) {
			return true
		}

		if (pitch !== undefined && pitch !== this.state.pitch) {
			return true
		}

		if (rotation !== undefined && rotation !== this.state.rotation) {
			return true
		}

		return false
	}

	private updateCameraStatus() {
		const { polarisInstance } = this.state
		if (!polarisInstance) {
			return
		}
		const CODE_VERSION = 1
		const center = this.props.center || this.state.center
		const pitch = this.props.pitch || this.state.pitch
		const rotation = this.props.rotation || this.state.rotation
		const zoom = this.props.zoom || this.state.zoom
		const statesTuple = [
			CODE_VERSION, // 0
			(center[0] || 0).toFixed(6), // 1
			(center[1] || 0).toFixed(6), // 2
			(center[2] || 0).toFixed(6), // 3
			(pitch || 0).toFixed(5), // 4
			(rotation || 0).toFixed(5), // 5
			(zoom || 0).toFixed(5), // 6
		]
		polarisInstance.setStatesCode(statesTuple.join('|'))
		this.setState({
			center,
			pitch,
			rotation,
			zoom,
		})
	}

	render() {
		const { children, width, height } = this.props
		const { polarisInstance } = this.state

		return (
			<div
				ref={this.refRoot}
				style={{
					width,
					height,
				}}>
				{polarisInstance &&
					Children.map(children, (child) => {
						if (child === undefined || child === null) {
							return
						}
						// pass polarisInstance to child components
						return cloneElement(child as any, { polarisInstance })
					})}
			</div>
		)
	}
}
