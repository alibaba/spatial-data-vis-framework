import { Mesh } from '@gs.i/frontend-sdk'
import { buildBox } from '@gs.i/utils-geom-builders'
import { StandardLayer } from '@polaris.gl/gsi'
import { PolarisLite } from '@polaris.gl/lite'

import { generateScene } from '@gs.i/utils-random-scene'
import { IndicatorProcessor } from '@gs.i/processor-indicator'
import { HelperLayer } from '@polaris.gl/layer-std-helper'

import { MarkerLayer, Marker } from '@polaris.gl/layer-std-marker'
import { AMapLayer } from '@polaris.gl/layer-amap'
import { specifyUnlitMaterial } from '@gs.i/utils-specify'

await test(true, 'PolarisLite', () => {
	const p = new PolarisLite({
		container: document.querySelector('#container') as HTMLDivElement,
		background: 'transparent',
		// autoplay: false,
		asyncRendering: true, // 为了和AMap渲染同步加的参数，在AMap加载的时候一定要打开
		// autoResize: true,
		width: 700,
		height: 700,
	})

	const h = new HelperLayer()
	p.add(h)
	h.setProps({ box: false })

	// p.addEventListener('viewChange', (e) => {
	// 	console.log(e)
	// })
	globalThis.p = p
	console.log(p)

	const markerLayer = new MarkerLayer()
	p.add(markerLayer)

	const marker = new Marker({ html: 'hahaha' })
	markerLayer.add(marker)

	const marker2 = new Marker({ html: 'hoho', lng: 0.01 })
	markerLayer.add(marker2)

	const marker3 = new Marker({
		object3d: generateScene({
			// scale: 1000,
			count: 10,
			depth: 10,
			useAnimation: true,
			useSprite: true,
			usePoint: false,
			resolution: [500, 500],
		}),
		lng: 0.01,
		lat: 0.01,
	})
	markerLayer.add(marker3)

	const marker4 = new Marker({
		object3d: generateScene({
			// scale: 1000,
			count: 10,
			depth: 10,
			useAnimation: true,
			useSprite: true,
			usePoint: false,
			resolution: [500, 500],
		}),
		lng: -0.01,
		lat: 0.01,
	})
	markerLayer.add(marker4)
	const marker5 = new Marker({
		html: '5',
		object3d: new Mesh({
			material: specifyUnlitMaterial({ type: 'unlit', baseColorFactor: { r: 1, g: 0, b: 0 } }),
			geometry: buildBox({ width: 0.5, height: 0.5, depth: 0.5 }),
		}),
		lng: 119.918,
		lat: 30.0475,
	})
	markerLayer.add(marker5)

	// ---------------------
	// 传入外部amap instance并交给Polaris管理
	// ---------------------
	window['onAMapLoaded'] = () => {
		const polarisElement = p.view.html.element
		const amapContainer = document.createElement('div')
		amapContainer.id = 'user-amap-container'
		// AMap DOM 需要在被Polaris container覆盖在上层
		if (polarisElement.hasChildNodes()) {
			polarisElement.insertBefore(amapContainer, polarisElement.firstChild)
		} else {
			polarisElement.appendChild(amapContainer)
		}
		// 确保 Polaris 和 AMap 的 DOM width/height 一致
		amapContainer.style.width = polarisElement.style.width
		amapContainer.style.height = polarisElement.style.height

		const map = new window['AMap'].Map('user-amap-container', {
			// 默认属性
			viewMode: '3D',
			animateEnable: false, // 为了相机同步，禁止缓动效果
			jogEnable: false, // 为了相机同步，禁止动画效果
			buildingAnimation: false, // 禁止楼快出现动画效果
			resizeEnable: true,
			expandZoomRange: true, // zooms默认最大为19，true才能放大至20
			zooms: [3, 20], // 高德默认[3,19]
			zoomEnable: true,
			// 自定义属性
			center: [120, 30],
			zoom: 8,
			mapStyle: 'amap://styles/normal',
			layers: [],
			features: ['bg', 'road'],
			// 区别投影
			crs: 'EPSG3857',
			showLabel: false,
		})
		const amapLayer = new AMapLayer({ amapInstance: map })
		p.add(amapLayer)

		console.log(amapLayer)
	}
	const url =
		'https://webapi.amap.com/maps?v=2.0&key=6bfc5bc9f3037cfc65a0fd282de5d57f&callback=onAMapLoaded'
	const jsapi = document.createElement('script')
	jsapi.charset = 'utf-8'
	jsapi.src = url
	document.head.appendChild(jsapi)

	p.setStatesCode('1|119.918672|30.047431|0.000000|0.00000|-0.00000|16.66800')
})

// ===

async function test(enable: boolean, name: string, fun: () => void, duration = 1000) {
	if (!enable) return
	console.group(name)
	fun()
	await new Promise((resolve, reject) => {
		setTimeout(() => resolve(true), duration)
	})
	console.log(`test end (${name})`)
	console.groupEnd()
	return
}
