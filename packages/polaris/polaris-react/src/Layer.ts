import { PureComponent } from 'react'
import { LayerProps, LayerState } from './types'

export class LayerReact extends PureComponent<LayerProps, LayerState> {
	constructor(props) {
		super(props)

		this.state = new LayerState()
	}

	componentDidMount() {
		this.init()
	}

	init = () => {
		const { polarisInstance, LayerClass, children, ...otherLayerProps } = this.props

		if (!polarisInstance) {
			throw new Error('No Polaris component was found')
		}

		const layerInstance = new LayerClass(otherLayerProps)
		polarisInstance.add(layerInstance)
		this.setState({ layerInstance })
	}

	render() {
		return null
	}
}
