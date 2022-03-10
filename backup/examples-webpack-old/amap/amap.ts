import { PolarisGSIGL2 as Polaris } from '@polaris.gl/gsi-gl2'
// import { PolarisLite as Polaris } from '@polaris.gl/lite'
import { AMapLayer } from '@polaris.gl/layer-amap'
import { PolygonLayer } from '@polaris.gl/layer-geojson'
declare let window: any

const p = new Polaris({
	container: document.querySelector('#container') as HTMLDivElement,
	width: 1000,
	height: 500,
	debug: true,
	lights: {},
	cameraControl: true,
	background: 'transparent',
	asyncRendering: true, // 为了和AMap渲染同步加的参数，在AMap加载的时候一定要打开
})
// p.timeline._config.onError = (e) => throw e

// ---------------------
// 添加由Polaris初始化和管理的amapLayer
// ---------------------
// const amapLayer = new AMapLayer({
// 	showLogo: false, // 是否显示高德logo
// 	style: 'normal', // 主题有: 标准-normal, 幻影黑-dark,月光银-light,远山黛-whitesmoke,草色青-fresh,雅土灰-grey,涂鸦-graffiti,马卡龙-macaron,靛青蓝-blue,极夜蓝-darkblue,酱籽-wine
// 	layers: [
// 		// 地图显示图层集合: 卫星图层-Satellite,路网图层RoadNet,实施交通图层-Traffic
// 		{ name: 'TileLayer', show: true },
// 		{ name: 'Satellite', show: false },
// 		{ name: 'RoadNet', show: false },
// 		{ name: 'Traffic', show: false },
// 	],
// 	features: [
// 		// 地图显示要素集合: 区域面-bg,兴趣点-point,道路及道路标注-road,建筑物-building
// 		{ name: 'bg', show: true },
// 		{ name: 'point', show: false },
// 		{ name: 'road', show: true },
// 		{ name: 'building', show: false },
// 	],
// })
// p.add(amapLayer)
// window.layer = amapLayer

// ---------------------
// 传入外部amap instance并交给Polaris管理
// ---------------------
window.onAMapLoaded = () => {
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

	const map = new window.AMap.Map('user-amap-container', {
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
	window.layer = amapLayer
}
const url =
	'https://webapi.amap.com/maps?v=1.4.15&key=f8d835e1abdb0e4355b19aa454f4de65&callback=onAMapLoaded'
const jsapi = document.createElement('script')
jsapi.charset = 'utf-8'
jsapi.src = url
document.head.appendChild(jsapi)

// PolygonLayer demo
const polygonLayer = new PolygonLayer({
	getFillColor: '#ffff00',
	getSideColor: '#999999',
	getThickness: 1,
	enableExtrude: false,
	transparent: true,
	getFillOpacity: 0.5,
	baseAlt: 0,
	data: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/simple/amap/China_Fill_Dissolved_25.json',
	pickable: false,
})
p.add(polygonLayer)

// set camera state
p.setStatesCode('1|111.795041|36.269810|0.000000|0.80000|0.00000|4.00000')

window.p = p
