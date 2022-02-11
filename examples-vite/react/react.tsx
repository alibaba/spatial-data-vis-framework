import React from 'react'
import ReactDOM from 'react-dom'
import PolarisReact, { LayerReact } from '@polaris.gl/react'
import { PolarisLite } from '@polaris.gl/lite'
import { HelperLayer } from '@polaris.gl/layer-std-helper'
// import { PolygonLayer } from '@polaris.gl/layer-geojson' // TODO: Worker issue
import { MarkerLayer } from '@polaris.gl/layer-std-marker'
import { AMapLayer } from '@polaris.gl/layer-amap'

const container = document.querySelector('#container') as HTMLDivElement

// markers data
const div = document.createElement('div')
div.style.fontSize = '12px'
div.style.background = '#00ffff'
div.style.width = '40px'
div.style.height = '40px'
const markerData: any[] = []
for (let i = 0; i < 20; i++) {
	const html = div.cloneNode() as HTMLElement
	html.style.background = `#${Math.floor(Math.random() * 0xffffff).toString(16)}`
	html.innerHTML = 'text' + i
	markerData.push({
		lng: Math.random() * 360,
		lat: -60 + Math.random() * 120,
		alt: 0, // 1000000 * Math.random(),
		html: html,
		autoHide: false, // Math.random() > 0.5,
	})
}

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
			const newState = {
				width: 700,
				height: 700,
			}
			console.log('size change', newState)
			this.setState(newState)
		}, 1500)

		setTimeout(() => {
			const newState = {
				center: [-10, 0],
				zoom: 4,
				rotation: -1,
				markerData,
			}
			console.log('view change', newState)
			this.setState(newState)
		}, 3000)
	}

	render() {
		const { width, height, center, zoom, rotation, markerData } = this.state

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
					window['p'] = polarisInstance
				}}>
				<LayerReact
					layerClass={HelperLayer}
					length={10000000}
					getLayerInstance={(layerInstance) => {
						console.log('helperLayer', layerInstance)
					}}></LayerReact>
				{markerData && (
					<LayerReact
						layerClass={MarkerLayer}
						data={markerData}
						offsetX={-20}
						offsetY={-20}
						getLayerInstance={(layerInstance) => {
							console.log('markerLayer', layerInstance)
						}}></LayerReact>
				)}
				<LayerReact layerClass={AMapLayer}></LayerReact>
			</PolarisReact>
		)
	}
}

ReactDOM.render(<App />, container)
