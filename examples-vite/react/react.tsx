import React from 'react'
import ReactDOM from 'react-dom'
import PolarisReact, { LayerReact } from '@polaris.gl/react'
import { PolarisLite } from '@polaris.gl/lite'
import { HelperLayer } from '@polaris.gl/layer-std-helper'
// import { PolygonLayer } from '@polaris.gl/layer-geojson' // TODO: Worker issue
import { MarkerLayer } from '@polaris.gl/layer-std-marker'
import { AMapLayer } from '@polaris.gl/layer-amap'

const container = document.querySelector('#container') as HTMLDivElement

class App extends React.Component {
	state: any = {
		width: 500,
		height: 500,
		center: [0, 0],
		zoom: 3,
		rotation: 0,
	}

	constructor(props: any) {
		super(props)
	}

	componentDidMount() {
		setTimeout(() => {
			console.log('view change')
			this.setState({
				width: 700,
				height: 700,
				center: [5, 5],
				zoom: 5,
				rotation: 1.7,
			})
		}, 1500)
	}

	render() {
		const { width, height, center, zoom, rotation } = this.state

		// markers data
		const div = document.createElement('div')
		div.style.fontSize = '12px'
		div.style.background = '#00ffff'
		div.style.width = '40px'
		div.style.height = '40px'
		const data: any[] = []
		for (let i = 0; i < 20; i++) {
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
				center={center}
				zoom={zoom}
				rotation={rotation}
				background={'transparent'}
				autoResize={true}
				getPolarisInstance={(polarisInstance) => {
					console.log('polarisInstance', polarisInstance)
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
