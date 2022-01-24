import { PureComponent } from 'react'
import { TLayerProps, LayerProps, LayerState } from './types'

export class LayerReact extends PureComponent<TLayerProps, LayerState> {
	static defaultProps = new LayerProps()

	constructor(props) {
		super(props)

		this.state = new LayerState()
	}

	componentDidMount() {
		this.init()
	}

	init = () => {
		const { polarisInstance, LayerClass, children, ...otherLayerProps } = this.props

		if (!LayerClass) {
			throw new Error('LayerReact - LayerClass must be provided')
		}

		if (!polarisInstance) {
			throw new Error('LayerReact - Polaris component must be provided')
		}

		const layerInstance = new LayerClass(otherLayerProps)
		polarisInstance.add(layerInstance)
		this.setState({ layerInstance })
	}

	render() {
		return null
	}
}
