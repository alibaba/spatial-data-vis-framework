import { POILayer } from '@polaris.gl/layer-xyz-poi-tile'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { HelperLayer } from '@polaris.gl/layer-std-helper'
import { AMapLayer } from '@polaris.gl/layer-amap'

const p = new PolarisGSIGL2({
	container: document.querySelector('#container') as HTMLDivElement,
	width: 800,
	height: 800,
	lights: {},
	autoResize: true,
	asyncRendering: true,
})
p.timeline.config.ignoreErrors = false

//
let lastHovered
const layer = new POILayer({
	clusterNumFilter: (feature) => {
		if (feature.properties.num > 20) {
			return Math.round(feature.properties.num)
		}
	},
	getPointColor: () => {
		const r = Math.round(16 + Math.random() * 239)
		const g = Math.round(Math.random() * 255)
		const b = Math.round(16 + Math.random() * 239)
		return `#${r.toString(16)}9f${b.toString(16)}`
	},
	clusterDOMStyle: {
		color: '#ffffff',
		fontSize: '14px',
	},
	pickable: true,
	onPicked: (data) => {
		console.log('data', data)
	},
	onHovered: (data) => {
		if (lastHovered !== undefined) {
			layer.highlightByIds([lastHovered], { type: 'none' })
		}

		if (!data || data.data.curr === undefined) return

		const feature = data.data.curr

		layer.highlightByIds([feature.properties.id], { type: 'hover' })
		lastHovered = feature.properties.id
	},
})
p.add(layer)

// amap
const amapLayer = new AMapLayer({
	showLogo: false,
})
p.add(amapLayer)

p.setStatesCode('1|120.184300|30.265237|0.000000|0.00000|0.00000|8.00000')

window['p'] = p
window['layer'] = layer
