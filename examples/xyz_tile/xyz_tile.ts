import { MercatorProjection } from '@polaris.gl/projection'
import { POILayer, AOILayer } from '@polaris.gl/layer-xyz-poi-tile'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { AMapLayer } from '@polaris.gl/layer-amap'

document.body.style.backgroundColor = '#333'

const p = new PolarisGSIGL2({
	container: document.querySelector('#container') as HTMLDivElement,
	width: 800,
	height: 800,
	lights: {},
	autoResize: true,
	asyncRendering: true,
	projection: new MercatorProjection({
		center: [104, 35.4],
	}),
})
p.timeline.config.ignoreErrors = false

const getPOIUrl = (x, y, z) => {
	const params = {
		PostgreSQL: {
			dbname: 'EXAMPLE',
			user: 'EXAMPLE',
			password: 'EXAMPLE',
			host: 'EXAMPLE',
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
			output_format: 'geojson_pbf',
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
						clustering_scalar: 500,
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
		'EXAMPLE' +
		JSON.stringify(params)
	)
}

const getAOIUrl = (x, y, z) => {
	const params = {
		PostgreSQL: {
			dbname: 'EXAMPLE',
			user: 'EXAMPLE',
			password: 'EXAMPLE',
			host: 'EXAMPLE',
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
			source: '浙江省_杭州市_building',
			output_format: 'geojson_pbf',
			layer: {
				default: {
					geometry_type: 'Polygon',
					visible_columns: [],
					simplify_scalar: 7,
					filter_expression: null,
					preserve_collapsed: false,
					with_boundary: true,
					visible_zlevel: [3, 20],
					clickable_zlevel: [13, 20],
				},
			},
		},
	}
	return (
		'EXAMPLE' +
		JSON.stringify(params)
	)
}

const size = 32

async function getImage(): Promise<string> {
	return new Promise((resolve, reject) => {
		const drawSize = size * 2
		const canvas = document.createElement('canvas')
		canvas.style.width = drawSize + 'px'
		canvas.style.height = drawSize + 'px'
		canvas.style.position = 'absolute'
		canvas.style.left = '0px'
		canvas.style.top = '0px'
		canvas.width = drawSize
		canvas.height = drawSize
		const ctx = canvas.getContext('2d')
		const img = document.createElement('img')
		img.setAttribute('crossOrigin', 'anonymous')

		const baseImg = document.createElement('img')
		baseImg.setAttribute('crossOrigin', 'anonymous')

		const draw1 = new Promise<void>((resolve) => {
			baseImg.onload = () => {
				ctx.drawImage(baseImg, 0, 0, drawSize, drawSize)
				resolve()
			}
		})

		const draw2 = new Promise<void>((resolve) => {
			img.onload = () => {
				ctx.drawImage(img, 0, 0, drawSize, drawSize)
				resolve()
			}
		})

		img.src =
			'https://img.alicdn.com/imgextra/i4/O1CN015vsPFD1Vltf7FmcZW_!!6000000002694-2-tps-256-256.png'
		baseImg.src =
			'https://img.alicdn.com/imgextra/i3/O1CN01naDbsE1HeeoOqvic6_!!6000000000783-2-tps-256-256.png'

		document.body.appendChild(canvas)

		Promise.all([draw1, draw2]).then(() => {
			resolve(canvas.toDataURL())
		})
	})
}

//
async function initPOI() {
	let lastHovered
	const poi = new POILayer({
		// pointImage: await getImage(),
		pointSize: size,
		pointHoverSize: 48,
		pointOffset: [0.0, 0.5],
		dataType: 'pbf',
		minZoom: 3,
		maxZoom: 20,
		getUrl: getPOIUrl,
		getClusterCount: (feature) => {
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
				poi.highlightByIds([lastHovered], { type: 'none' })
			}

			if (!data || data.data.curr === undefined) return

			const feature = data.data.curr
			const id = feature.properties.id
			if (!id) return
			poi.highlightByIds([id], { type: 'hover' })
			lastHovered = id
		},
	})
	p.add(poi)

	window['poi'] = poi
}

// initPOI()

// AOI
const highlighted: any[] = []
const aoi = new AOILayer({
	getUrl: getAOIUrl,
	getColor: 0xffaf88,
	getOpacity: 0.5,
	transparent: true,
	pickable: true,
	onPicked: (info) => {
		console.log('info', info)
		if (info && info.data && info.data.feature) {
			const feature = info.data.feature
			const id = feature.properties.id
			aoi.highlightByIds([id], { type: 'select' })
			highlighted.push(id)
			console.log('feature id', id)
		} else {
			aoi.highlightByIds(highlighted, { type: 'none' })
			highlighted.length = 0
		}
	},
})
p.add(aoi)
window['aoi'] = aoi

// amap
const amapLayer = new AMapLayer({
	showLogo: false,
})
p.add(amapLayer)

p.setStatesCode('1|120.184300|30.265237|0.000000|0.00000|0.00000|8.00000')

window['p'] = p
