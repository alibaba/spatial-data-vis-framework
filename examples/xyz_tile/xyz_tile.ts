import { POILayer } from '@polaris.gl/layer-xyz-poi-tile'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
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

const getUrl = (x, y, z) => {
	const params = {
		PostgreSQL: {
			dbname: 'test-1',
			user: 'kou_admin',
			password: 'kou_admin1234',
			host: 'pgm-bp1oi8k60xk5861j146270.pg.rds.aliyuncs.com',
			port: '1921',
		},
		fc_param: {
			x,
			y,
			z,
			id_column: 'id',
			geometry_column: 'geometry',
			clip_geometry: null,
			area_code: null,
			source: 'hz_house_order',
			output_format: 'geojson',
			layer: {
				default: {
					geometry_type: 'point',
					visible_columns: ['count'],
					filter_expression: [],
					visible_zlevel: [3, 20],
					clickable_zlevel: [15, 20],
					aggregation: {
						zlevel: [3, 15],
						clustering_method: 'bin',
						clustering_scalar: 50,
						fields: {
							count_number: ['id', 'count'],
							sum_number: ['count', 'sum'],
						},
					},
				},
			},
		},
	}
	return (
		'http://223675737204339375.cn-zhangjiakou-test-corp.test.fc.aliyun-inc.com/2016-08-15/proxy/fbi-geo.py-get-mvt__stable/py-get-mvt/api?data=' +
		JSON.stringify(params)
	)
}

//
let lastHovered
const layer = new POILayer({
	minZoom: 3,
	maxZoom: 20,
	getUrl,
	clusterNumFilter: (feature) => {
		if (feature.properties.number_of_point > 1) {
			return Math.round(feature.properties.number_of_point)
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
		const id = feature.properties.id
		if (!id) return
		layer.highlightByIds([id], { type: 'hover' })
		lastHovered = id
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
