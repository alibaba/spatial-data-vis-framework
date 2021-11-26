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
	lights: {
		ambientLight: { color: '#ffffff' },
	},
	cameraControl: true,
	zoom: 3.9,
	background: 'transparent',
	asyncRendering: true, // 为了和AMap渲染同步加的参数，在AMap加载的时候一定要打开
})
p.timeline.config.ignoreErrors = false

// 添加amaplayer
const amapLayer = new AMapLayer({
	renderOrder: -999,
	showLogo: true, // 是否显示高德logo
	style: 'normal', // 主题有: 标准-normal, 幻影黑-dark,月光银-light,远山黛-whitesmoke,草色青-fresh,雅土灰-grey,涂鸦-graffiti,马卡龙-macaron,靛青蓝-blue,极夜蓝-darkblue,酱籽-wine
	layers: [
		// 地图显示图层集合: 卫星图层-Satellite,路网图层RoadNet,实施交通图层-Traffic
		{ name: 'Satellite', show: false },
		{ name: 'RoadNet', show: false },
		{ name: 'Traffic', show: false },
	],
	features: [
		// 地图显示要素集合: 区域面-bg,兴趣点-point,道路及道路标注-road,建筑物-building
		{ name: 'bg', show: true },
		{ name: 'point', show: false },
		{ name: 'road', show: true },
		{ name: 'building', show: false },
	],
})
p.add(amapLayer)

const polygonLayer = new PolygonLayer({
	getFillColor: '#ffff00',
	getSideColor: '#999999',
	getThickness: 1,
	enableExtrude: false,
	transparent: true,
	// opacity: 0.5,
	baseAlt: 0,
	data: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/simple/amap/China_Fill_Dissolved_25.json',
	pickable: false,
})
p.add(polygonLayer)

window.p = p
window.layer = amapLayer

window.p.setStatesCode('1|111.795041|36.269810|0.000000|0.80000|0.00000|4.00000')
