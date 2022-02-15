/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { StandardLayer, StandardLayerProps } from '@polaris.gl/layer-std'
declare let window: any

export interface AMapLayerProps extends StandardLayerProps {
	key: string
	showLogo: boolean
	showLabel: boolean
	zooms: [number, number]
	style: string
	layers: { name: string; show: boolean }[]
	features: { name: string; show: boolean }[]
	zIndex: number

	/**
	 * user defined custom instance of amap
	 */
	amapInstance?: any
}

export const defaultProps: AMapLayerProps = {
	key: 'f8d835e1abdb0e4355b19aa454f4de65', // 高德API使用key,可以缺省
	// key: '550dbc967967e5a778337699e04435fa',
	zIndex: -9999,
	showLogo: true, // 是否显示高德logo
	showLabel: false, // 是否显示地图标注
	zooms: [3, 20], // 地图缩放上下限,默认3~20
	style: 'normal', // //主题有: 标准-normal, 幻影黑-dark,月光银-light,远山黛-whitesmoke,草色青-fresh,雅土灰-grey,涂鸦-graffiti,马卡龙-macaron,靛青蓝-blue,极夜蓝-darkblue,酱籽-wine
	layers: [
		// 地图显示图层集合: 卫星图层-Satellite,路网图层RoadNet,实施交通图层-Traffic
		{ name: 'TileLayer', show: true },
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
}

// eslint-disable-next-line @typescript-eslint/ban-types
export class AMapLayer extends StandardLayer<{}, AMapLayerProps> {
	projection
	cam
	map
	isWarning = false //高德参数是否正常
	AMap
	key

	constructor(props: Partial<AMapLayerProps> = {}) {
		super({
			name: 'AMapLayer',
			...defaultProps,
			...props,
		})
		this.setProps(props)

		this.group.name = 'AMapLayer'
		this.element.className = 'polaris-amap-layer'
		this.element.id = 'polaris-amap-layer'

		this.addEventListener('init', ({ projection, timeline, polaris }) => {
			// polaris图层背景透明
			polaris['renderer'].renderer.setClearAlpha(0.0)
			// 获取相机和投影
			this.cam = polaris.cameraProxy
			this.projection = projection

			// amap属性监听
			this.listenProps(
				[
					'key',
					'showLogo',
					'showLabel',
					'zooms',
					'style',
					'layers',
					'features',
					'zIndex',
					'amapInstance',
				],
				() => {
					const amapInstance = this.getProp('amapInstance')
					const key = this.getProp('key')
					const zooms = this.getProp('zooms')

					// set polaris zoomLimit the same as AMap
					polaris.updateProps({
						zoomLimit: zooms,
					})

					if (amapInstance) {
						// use custom instance
						this.map = amapInstance
						this._initAmapCamera(polaris)
						this.onViewChange = (cam) => {
							this._synchronizeCameras(cam, polaris, projection)
						}
					} else if (!window.AMap || this.key !== key) {
						this.key = key
						this._loadJSAPI(key, () => {
							this._initAMap(window.AMap)
							this._initAmapCamera(polaris)
							this.onViewChange = (cam) => {
								this._synchronizeCameras(cam, polaris, projection)
							}
							// 更新地图
							this._updateAMap(window.AMap)
						})
					} else {
						this._updateAMap(window.AMap)
					}
				}
			)
		})
	}

	/**
	 * 异步加载高德JS
	 * @param {*} key 高德API秘钥
	 */
	_loadJSAPI = (key: string, callback: any) => {
		window.onAMapLoaded = () => {
			console.log('AMap script loaded')
			if (window.AMap) {
				callback()
			} else {
				console.warn(`高德JSAPI未能成功加载，请检查key是否正确!`)
			}
		}
		const url = 'https://webapi.amap.com/maps?v=1.4.15&key=' + key + '&callback=onAMapLoaded'
		// const url = 'https://webapi.amap.com/maps?v=2.0&key=' + key + '&callback=onAMapLoaded'
		const jsapi = document.createElement('script')
		jsapi.charset = 'utf-8'
		jsapi.src = url
		document.body.appendChild(jsapi)
	}

	/**
	 * 初始化高德图层
	 * @param {*} AMap 高德API
	 */
	_initAMap = (AMap: any) => {
		// Amap图层必须在最底层
		const parentElement = this.element.parentElement
		if (parentElement) {
			parentElement.removeChild(this.element)
			if (parentElement.hasChildNodes()) {
				parentElement.insertBefore(this.element, parentElement.firstChild)
			} else {
				parentElement.appendChild(this.element)
			}
		}
		const polarisElement = document.getElementsByClassName('polaris-wrapper')[0]
		if (parentElement) {
			parentElement.style.height = polarisElement['style'].height
			parentElement.style.width = polarisElement['style'].width
			this.element.style.height = parentElement['style'].height
			this.element.style.width = parentElement['style'].width
		}

		this.element.style.position = 'absolute'
		this.element.style.zIndex = `${this.getProp('zIndex') ?? -9999}`

		if (AMap !== undefined) {
			// 钉钉、手淘、阿里数据webview中amap默认不开启WebGL绘制，强制开启需要设置全局属性:
			// https://lbs.amap.com/faq/js-api/map-js-api/create-project/1060847223
			window.forceWebGL = true
			this.map = new AMap.Map(this.element, {
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
				crs: this.projection.type === 'MercatorProjection' ? 'EPSG3857' : 'EPSG4326',
				showLabel: this.getProp('showLabel'),
			})
		}
	}

	/**
	 * 设置高德图层的参数
	 */
	_updateAMap = (AMap) => {
		// 图层顺序
		const zIndex = this.getProp('zIndex')

		if (this.element) {
			this.element.style.zIndex = `${zIndex}`
		}
		const style = this.getProp('style')
		const layers = this.getProp('layers')
		const features = this.getProp('features')
		if (AMap !== undefined) {
			// 改变样式
			this.map.setMapStyle('amap://styles/' + style)

			// 添加图层
			const layerArr: any[] = []
			if (layers) {
				for (let i = 0; i < layers.length; i++) {
					const layer = layers[i]
					if (layer.show) {
						const newLayer =
							layer.name === 'TileLayer'
								? new AMap.TileLayer({})
								: new AMap.TileLayer[layer.name]({})
						layerArr.push(newLayer)
					}
				}
			}
			if (layerArr.length === 0) {
				console.warn('AMapLayer - No layers found, add default TileLayer')
				layerArr.push(new AMap.TileLayer({}))
			}
			this.map.setLayers(layerArr)

			// 添加要素
			const featuresArr = new Array<string>()
			if (features) {
				for (let i = 0; i < features.length; i++) {
					if (features[i].show) {
						featuresArr.push(features[i].name)
					}
				}
			}
			this.map.setFeatures(featuresArr)

			// 是否显示高德logo和copyright
			const showLogo = this.getProp('showLogo')
			const logoElement = document.getElementsByClassName('amap-logo')[0]
			const colpyRightElement = document.getElementsByClassName('amap-copyright')[0]
			if (!showLogo && logoElement && colpyRightElement) {
				logoElement['style'].visibility = 'hidden'
				colpyRightElement['style'].opacity = 0
			} else {
				logoElement['style'].visibility = 'inherit'
				colpyRightElement['style'].opacity = 1
			}
		}
	}

	/**
	 * 立即同步相机
	 */
	_initAmapCamera = (polaris: any) => {
		if (!this.map) return

		const cam = polaris.cameraProxy
		// 限制polaris的zoom范围与高德对应
		const zooms = this.getProp('zooms')
		const zoomMin = zooms[0]
		const zoomMax = zooms[1]
		if (cam.zoom <= zoomMin) {
			cam.setZoom(zoomMin)
		}
		if (cam.zoom >= zoomMax) {
			cam.setZoom(zoomMax)
		}
		// 更新polaris视角
		const param = zoomToPerspectiveParam(cam.zoom, cam.canvasWidth, cam.canvasHeight)
		const newFov = (param.fov / Math.PI) * 180.0

		polaris.renderer.updateProps({ fov: newFov })
		cam.fov = newFov
		cam.update()

		// 稍微改变经纬度触发同步
		const amapCenter = this.projection.unproject(...cam.center)
		const { pitch, rotation, zoom } = cam
		const statesCode =
			'1|' +
			(amapCenter[0] + 0.000001).toFixed(6) +
			'|' +
			amapCenter[1].toFixed(6) +
			'|0.000000|' +
			pitch.toFixed(5) +
			'|' +
			rotation.toFixed(5) +
			'|' +
			zoom.toFixed(5)
		polaris.setStatesCode(statesCode)
		polaris.tick()
	}

	/**
	 * 相机同步（暂时是polaris操作高德,实现基本视角控制）
	 */
	_synchronizeCameras = (cameraProxy, polaris, projection) => {
		if (this.map === undefined) return

		const { zoom, pitch, rotation, center } = cameraProxy
		const { canvasWidth, canvasHeight } = polaris
		const ZOOM_MIN = this.getProp('zooms')[0]
		const ZOOM_MAX = this.getProp('zooms')[1]
		const lnglatCenter = projection.unproject(...center)

		// 限制polaris的zooms与高德对应
		if (zoom <= ZOOM_MIN) {
			cameraProxy.setZoom(ZOOM_MIN)
		}
		if (zoom >= ZOOM_MAX) {
			cameraProxy.setZoom(ZOOM_MAX)
		}

		// 同步高德相机
		if (this.map && canvasWidth && canvasHeight) {
			const amapPitch = (pitch / Math.PI) * 180.0
			const amapRotation = (rotation / Math.PI) * 180.0

			this.map.setZoom(zoom)
			this.map.setCenter([lnglatCenter[0], lnglatCenter[1]])

			this.map.setPitch(amapPitch)
			this.map.setRotation(amapRotation)

			// 更新polaris视角
			// const param = this._zoomToPerspectiveParam(zoom, canvasWidth, canvasHeight)
			// const newFov = (param.fov / Math.PI) * 180.0
			// p.renderer.updateProps({ fov: newFov })
			// cameraProxy.fov = newFov
			// cameraProxy.update()

			// 检测高德地图是否有跟随polaris变化
			const newZoom = this.map.getZoom()
			const newCenter = this.map.getCenter()
			const newPitch = this.map.getPitch()
			const threshold = 0.001

			// 2021.09.27 @qianxun 根据高德的实时lat limits限制polaris视角center
			if (Math.abs(lnglatCenter[1] - newCenter.lat) > threshold) {
				cameraProxy.setCenter(projection.project(lnglatCenter[0], newCenter.lat))
			}

			// auto resize 高德
			// if (
			// 	this.map.getContainer().clientWidth !== polaris.width ||
			// 	this.map.getContainer().clientHeight !== polaris.height
			// ) {
			// 	// 屏幕像素
			// 	this.map.getContainer().style.width = polaris.width + 'px'
			// 	this.map.getContainer().style.height = polaris.height + 'px'
			// 	// 逻辑像素
			// 	this.map.getContainer().width = polaris.width
			// 	this.map.getContainer().height = polaris.height
			// 	this.map.resize && this.map.resize()
			// }

			// 屏幕像素
			this.map.getContainer().style.width = polaris.width + 'px'
			this.map.getContainer().style.height = polaris.height + 'px'
			// 逻辑像素
			this.map.getContainer().width = polaris.width
			this.map.getContainer().height = polaris.height
			this.map.resize && this.map.resize()
		}
	}
}

const equal = (a: number, b: number, threshold = 0.001) => {
	return Math.abs(a - b) < threshold
}

/**
 * 高德地图相机 fov 根据 zoom 变化而变化，Polaris 需要不断适应新的 fov
 * @param {*} zoom //3~20
 * @param {*} canvasW
 * @param {*} canvasH
 */
const zoomToPerspectiveParam = (zoom: number, canvasW: number, canvasH: number) => {
	const aspect = canvasW / canvasH
	const temp = (canvasH / 2) * Math.pow(2, 20 - zoom)
	let fov = ((56 - zoom) * Math.PI) / 180
	let height = temp / Math.tan(fov / 2)
	if (height < 2400) {
		height = 2400
		fov = 2 * Math.atan(temp / height)
	}

	const near = height / 10
	const far = height * 50

	return {
		fov,
		aspect,
		near,
		far,
		height,
	}
}
