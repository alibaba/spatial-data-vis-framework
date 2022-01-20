import React from 'react'
import ReactDOM from 'react-dom'
import PolarisReact, { LayerReact } from '@polaris.gl/react'
import { PolarisLite } from '@polaris.gl/lite'
import { HelperLayer } from '@polaris.gl/layer-std-helper'

const container = document.querySelector('#container') as HTMLDivElement

function App() {
	const width = 500
	const height = 500

	return (
		<PolarisReact PolarisClass={PolarisLite} width={width} height={height} autoResize={false}>
			<LayerReact LayerClass={HelperLayer}></LayerReact>
		</PolarisReact>
	)
}

ReactDOM.render(<App />, container)
