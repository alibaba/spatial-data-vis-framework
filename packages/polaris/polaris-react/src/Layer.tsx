import { PureComponent } from 'react'
import { LayerProps, DefaultLayerProps, LayerState } from './types'

export class LayerReact<TProps = { [name: string]: any }> extends PureComponent<
	LayerProps & TProps,
	LayerState
> {
	static defaultProps = new DefaultLayerProps()

	constructor(props) {
		super(props)

		this.state = new LayerState()
	}

	componentDidMount() {
		this.init()
	}

	componentWillUnmount() {
		if (this.state.layerInstance) {
			this.state.layerInstance.dispose()
		}
	}

	componentDidUpdate(prevProps, prevState, snapshot) {
		const { layerInstance } = this.state
		const { polarisInstance, layerClass, getLayerInstance, ...layerProps } = this.props

		if (!layerInstance) return

		layerInstance.updateProps(layerProps)
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
