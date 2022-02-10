import { PureComponent } from 'react'
import { LayerProps, DefaultLayerProps, LayerState } from './types'

export class LayerReact extends PureComponent<LayerProps, LayerState> {
	static defaultProps = new DefaultLayerProps()

	constructor(props) {
		super(props)

		this.state = new LayerState()
	}

	componentDidMount() {
		this.init()
	}

	init() {
		const { polarisInstance, layerClass, getLayerInstance, ...otherLayerProps } = this.props

		if (!layerClass) {
			throw new Error(`LayerReact - prop 'layerClass' must be provided`)
		}

		if (!polarisInstance) {
			throw new Error(`LayerReact - 'polarisInstance' must be provided`)
		}

		const layerInstance = new layerClass(otherLayerProps)

		polarisInstance.add(layerInstance)

		if (getLayerInstance) {
			getLayerInstance(layerInstance)
		}

		this.setState({ layerInstance })
	}

	render() {
		return null
	}
}
