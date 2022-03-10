import { MatrUnlit, Mesh, Geom, MatrSprite, Attr } from '@gs.i/frontend-sdk'
import { buildPlane } from '@gs.i/utils-geom-builders'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { MarkerLayer } from '@polaris.gl/layer-std-marker'

const container = document.querySelector('#container') as HTMLDivElement
const p = new PolarisGSIGL2({
	container: container,
	width: 800,
	height: 800,
	// ratio: 0.5,
	antialias: false,

	lights: {
		ambientLight: {
			intensity: 1,
		},
	},

	debug: true,
})

const indicator = document.createElement('div')
indicator.innerText = 'hovered'
indicator.style.position = 'absolute'
indicator.style.background = '#fff'
indicator.style.fontSize = '24px'
indicator.style.visibility = 'hidden'
p.view.html.element.appendChild(indicator)

// Marker objects
const markerMesh = new Mesh({
	name: 'Marker mesh',
	geometry: buildPlane({ width: 4000000, height: 4000000, widthSegments: 1, heightSegments: 1 }),
	material: new MatrUnlit({
		baseColorFactor: { r: 1, g: 0.5, b: 0 },
		side: 'front',
	}),
})

const div = document.createElement('div')
div.style.fontSize = '20px'
div.style.color = '#00ffff'
div.style.width = '20px'
div.style.height = '20px'

// Marker1 data
const count1 = 3
const data1: any[] = []
for (let i = 0; i < count1; i++) {
	const html = div.cloneNode() as HTMLElement
	html.style.color = `#${Math.floor(Math.random() * 0xffffff).toString(16)}`
	html.innerHTML = 'text' + i.toString()
	data1.push({
		lng: Math.random() * 360,
		lat: Math.random() * 90,
		// alt: 1000000 * Math.random(),
		html: html,
		// autoHide: Math.random() > 0.5,
	})
}

data1.push({
	lng: 116.46,
	lat: 39.92,
	html: `
		<img src="https://img.alicdn.com/imgextra/i2/O1CN01NZrfhA1F6BkSzra3t_!!6000000000437-1-tps-400-300.gif" width="32" height="32">
		<a>BEIJING</a>
	`,
})

const markerLayer1 = new MarkerLayer({
	html: '222',
	style: {
		color: '#ffffff',
	},
	object3d: markerMesh,
	offsetX: 0,
	offsetY: 0,
	// alt: 2000000,
	autoHide: true,
	data: data1,
	pickable: true,
})
markerLayer1.onPicked = (info) => {
	console.log('onPicked', info)
}
markerLayer1.onHovered = (info) => {
	if (info) {
		indicator.style.left = info.pointerCoords.canvas.x + 'px'
		indicator.style.top = info.pointerCoords.canvas.y + 'px'
		indicator.style.visibility = 'inherit'
	} else {
		indicator.style.visibility = 'hidden'
	}
}
p.add(markerLayer1)

// Marker2 data
const sprite = new Mesh({
	geometry: new Geom({
		mode: 'SPRITE',
		attributes: {
			position: new Attr(new Float32Array([0, 0, 0]), 3),
		},
	}),
	material: new MatrSprite({
		size: { x: 0.04, y: 0.04 },
		sizeAttenuation: false,
		baseColorTexture: {
			image: {
				uri: 'https://img.alicdn.com/imgextra/i3/O1CN01RbMgmM1DWAzg60GCD_!!6000000000223-0-tps-1024-1024.jpg',
			},
			sampler: {},
		},
		alphaMode: 'BLEND',
	}),
})

const count2 = 3
const data2: any[] = []
for (let i = 0; i < count2; i++) {
	data2.push({
		lng: Math.random() * 360,
		lat: Math.random() * 90,
		object3d: sprite,
		html: 'sprite' + i,
	})
}
const markerLayer2 = new MarkerLayer({
	style: {
		color: '#ffffff',
	},
	offsetX: 0,
	offsetY: 0,
	autoHide: true,
	data: data2,
	pickable: true,
})
markerLayer2.onPicked = (info) => {
	console.log('onPicked', info)
}
markerLayer2.onHovered = (info) => {
	if (info) {
		indicator.style.left = info.pointerCoords.canvas.x + 'px'
		indicator.style.top = info.pointerCoords.canvas.y + 'px'
		indicator.style.visibility = 'inherit'
	} else {
		indicator.style.visibility = 'hidden'
	}
}
p.add(markerLayer2)

//

p.setStatesCode('1|156.612934|44.775241|0.000000|0.25540|0.00000|1.00000')

window['container'] = container
window['p'] = p
window['layer1'] = markerLayer1
window['layer2'] = markerLayer2
