import React from 'react'
import ReactDOM from 'react-dom'
import PolarisReact, { LayerReact } from '@polaris.gl/react'
import { PolarisLite } from '@polaris.gl/lite'
import { HelperLayer } from '@polaris.gl/layer-std-helper'
// import { PolygonLayer } from '@polaris.gl/layer-geojson' // TODO: Worker issue
import { MarkerLayer } from '@polaris.gl/layer-std-marker'
import { AMapLayer } from '@polaris.gl/layer-amap'

const container = document.querySelector('#container') as HTMLDivElement

class App extends React.Component<any, any> {
	state: any = {
		width: 500,
		height: 500,
	}

	constructor(props: any) {
		super(props)
	}

	componentDidMount(): void {
		setTimeout(() => {
			console.log('change width/height')
			this.setState({
				width: 700,
				height: 700,
			})
		}, 1500)
	}

	render() {
		const { width, height } = this.state

		// markers data
		const div = document.createElement('div')
		div.style.fontSize = '12px'
		div.style.background = '#00ffff'
		div.style.width = '40px'
		div.style.height = '40px'
		const data: any[] = []
		for (let i = 0; i < 10; i++) {
			const html = div.cloneNode() as HTMLElement
			html.style.background = `#${Math.floor(Math.random() * 0xffffff).toString(16)}`
			html.innerHTML = 'text' + i
			data.push({
				lng: Math.random() * 360,
				lat: -90 + Math.random() * 180,
				alt: 0, // 1000000 * Math.random(),
				html: html,
				autoHide: false, // Math.random() > 0.5,
			})
		}

		return (
			<PolarisReact
				polarisClass={PolarisLite}
				width={width}
				height={height}
				background={'transparent'}
				zoom={3.0}
				autoResize={true}
				getPolarisInstance={(polaris) => {
					console.log('polarisInstance', polaris)
				}}>
				<LayerReact
					layerClass={HelperLayer}
					length={10000000}
					getLayerInstance={(layerInstance) => {
						console.log('helperLayer', layerInstance)
					}}></LayerReact>
				<LayerReact
					layerClass={MarkerLayer}
					data={data}
					offsetX={-20}
					offsetY={-20}
					getLayerInstance={(layerInstance) => {
						console.log('markerLayer', layerInstance)
					}}></LayerReact>
				<LayerReact layerClass={AMapLayer}></LayerReact>
			</PolarisReact>
		)
	}
}

ReactDOM.render(<App />, container)
