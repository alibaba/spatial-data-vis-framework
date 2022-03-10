/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import {
	AzimuthalEquidistantProjection,
	MercatorProjection,
	EquirectangularProjection,
	EquirectangularProjectionPDC,
	GallStereoGraphicProjection,
	SphereProjection,
} from '../src/index'
const p = new AzimuthalEquidistantProjection({ center: [0, 0] })

const values = [
	[0, 0],
	[10, 5],
	[90, 5],
	[180, 5],
	[180, 90],
	[-180, -90],
]

values.forEach((center) => {
	// const proj = new MercatorProjection({
	// const proj = new AzimuthalEquidistantProjection({
	// const proj = new EquirectangularProjection({
	const proj = new EquirectangularProjectionPDC({
		// const proj = new GallStereoGraphicProjection({
		// const proj = new SphereProjection({
		orientation: 'right',
		units: 'meters',
		center: center,
	})
	console.log('==', center, '==')
	values.forEach((ll) => {
		console.log(ll, '=>', proj.project(ll[0], ll[1]))
	})
})

const pro = new MercatorProjection({ center: [120.165573, 30.24495] })

const ll = [
	// 苏堤春晓
	[120.15417, 30.26433],
	// 曲院风荷
	[120.133521, 30.248435],
	// 平湖秋月
	[120.146244, 30.252133],
	// 断桥残雪
	[120.151588, 30.258512],
	// 柳浪闻莺
	[120.154539, 30.238967],
	// 花港观鱼
	[120.140377, 30.230974],
	// 雷峰夕照
	[120.149357, 30.231535],
	// 双峰插云
	[120.122503, 30.247613],
	// 南屏晚钟
	[120.148604, 30.229113],
	// 三潭印月
	[120.144111, 30.237565],
	// 阿里巴巴西溪园区
	[120.026199, 30.279172],
	// 阿里巴巴滨江园区
	[120.190792, 30.189665],
	// 菜鸟-西溪首座
	[120.076013, 30.287685],
	// 蚂蚁-Z空间
	[120.10799, 30.267107],
	// 蚂蚁-黄龙时代广场
	[120.125277, 30.272535],
	// 蚂蚁-黄龙国际中心
	[120.126258, 30.274674],
	// 钉钉-绿城未来PARK
	[120.016939, 30.285311],
	// 阿里云-EFC园区
	[120.001329, 30.280158],
	// 阿里巴巴-湖畔花园
	[120.101924, 30.286999],
	// 西溪湿地
	[120.075147, 30.269807],
	// 灵隐寺
	[120.102415, 30.240748],
]

const xyz = ll.map((l) => pro.project(...l))

console.log(JSON.stringify(xyz, null, '\t'))
