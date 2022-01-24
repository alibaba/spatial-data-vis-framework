import React from 'react'
import ReactDOM from 'react-dom'
import PolarisReact, { LayerReact } from '@polaris.gl/react'
import { PolarisLite } from '@polaris.gl/lite'
import { HelperLayer } from '@polaris.gl/layer-std-helper'
// import { PolygonLayer } from '@polaris.gl/layer-geojson'
import { MarkerLayer } from '@polaris.gl/layer-std-marker'

const container = document.querySelector('#container') as HTMLDivElement

function App() {
	const width = 500
	const height = 500

	// markers data
	const div = document.createElement('div')
	div.style.fontSize = '12px'
	div.style.background = '#00ffff'
	div.style.width = '20px'
	div.style.height = '20px'

	// Marker data
	const data: any[] = []
	for (let i = 0; i < 10; i++) {
		const html = div.cloneNode() as HTMLElement
		html.style.background = `#${Math.floor(Math.random() * 0xffffff).toString(16)}`
		html.innerHTML = 'text' + i
		data.push({
			lng: Math.random() * 360,
			lat: -90 + Math.random() * 180,
			// alt: 1000000 * Math.random(),
			html: html,
			// autoHide: Math.random() > 0.5,
		})
	}

	return (
		<PolarisReact
			PolarisClass={PolarisLite}
			width={width}
			height={height}
			autoResize={false}
			background={'#aabbcc'}>
			<LayerReact LayerClass={HelperLayer}></LayerReact>
			<LayerReact LayerClass={MarkerLayer} data={data}></LayerReact>
		</PolarisReact>
	)
}

ReactDOM.render(<App />, container)
