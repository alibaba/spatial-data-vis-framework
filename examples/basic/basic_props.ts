import { Mesh, MatrUnlit, MatrPbr } from '@gs.i/frontend-sdk'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { HelperLayer } from '@polaris.gl/layer-std-helper'
import { buildSphere } from '@gs.i/utils-geom-builders'
import { GeocentricProjection } from '@polaris.gl/projection'
import { StandardLayer, StandardLayerProps } from '@polaris.gl/layer-std'

const defaultProps = {
	a: 1,
	b: 2,
	c: 3,
	getColor: (item) => {
		if (item.orderCnt > 50) return 'red'
		return 'green'
	},
	getSize: {
		field: 'value',
		domain: [0, 100],
		range: [0, 1],
	},
	data: [
		{ lng: 112, lat: 30, orderCnt: 100, extra: { count: 5 } },
		{ lng: 118, lat: 38, orderCnt: 20, extra: { count: 11 } },
	],
}
class TestLayer extends StandardLayer {
	constructor(props: any) {
		props = {
			...defaultProps,
			...props,
		}
		super(props)

		this.setProps(props)
	}

	init() {
		this.listenProps('a', (e) => {
			const a = this.getProps('a')
			console.log('a: ', a)
		})
		this.listenProps(['b', 'getColor', 'data', 'dataTransform'], (e) => {
			const b = this.getProps('b')
			const getColor = this.getProps('getColor')
			const data = this.getProps('data')
			console.log('b: ', b)
			console.log('getColor: ', getColor)
			console.log('data: ', data)
		})
		this.listenProps(['getSize'], (e) => {
			const data = this.getProps('data')
			const getSize = this.getProps('getSize')
			const fdata = data.map((item) => {
				const size = getSize(item)
				return size
			})
			console.log('fdata: ', fdata)
		})
	}
}

const p = (window['p'] = new PolarisGSIGL2({
	container: document.querySelector('#container') as HTMLDivElement,
	width: 1000,
	height: 1000,
}))

const testLayer = new TestLayer({})
p.add(testLayer)

window['p'] = p
window['testLayer'] = testLayer

// testLayer.updateProps({'a': 3})

testLayer.updateProps({
	getSize: {
		field: 'orderCnt',
		domain: [0, 200],
		range: [0, 100],
	},
	dataTransform: {
		lng1: 'lng',
		lat1: 'lat',
		value: 'extra.count',
	},
})
