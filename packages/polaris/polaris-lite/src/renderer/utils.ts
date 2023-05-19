/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

const R = 6378137 // 常量 - 地球半径

export function calcCamNearFar(cameraProxy) {
	if (cameraProxy['zoom'] === undefined || cameraProxy['distance'] === undefined) {
		return []
	}
	let near, far
	if (cameraProxy.zoom <= 5) {
		// 看地球，太阳系?
		near = Math.max(100000, cameraProxy.distance - (16 - cameraProxy.zoom) * 2 * R) // zoom 1 -> 16 R
		far = cameraProxy.distance + (16 - cameraProxy.zoom) * 2 * R // 16 R
	} else if (cameraProxy.zoom > 5 && cameraProxy.zoom <= 12.5) {
		// 看国家、省份
		near = Math.max(10, cameraProxy.distance / 100)
		// percent最大不超过1/8，和下一级far保持一致
		const percent = Math.max(1 / 8, (17.5 - cameraProxy.zoom) / 12.5)
		far = cameraProxy.distance + 4 * R * percent
	} else if (cameraProxy.zoom > 12.5 && cameraProxy.zoom <= 16.5) {
		// 看城市
		near = Math.max(100, cameraProxy.distance / 40)
		// far = cameraProxy.distance + 0.25 * R
		const percent = (17.5 - cameraProxy.zoom) / 6
		far = cameraProxy.distance + 0.4 * R * percent
	} else {
		// 微距？
		near = 10
		const percent = (24 - cameraProxy.zoom) / 8
		far = cameraProxy.distance + 200000 * percent
	}
	// console.log('zoom, dis', cameraProxy.zoom, cameraProxy.distance)
	// console.log('near, far', near, far)
	return [near, far]
}

export function colorToString(RGB): string {
	if (Array.isArray(RGB)) {
		// if (RGB.length === 3) {
		return 'rgb(' + RGB.join(',') + ')'
		// } else {
		// 	console.warn('RGB应该为3位，alpha通道可能不会支持')
		// 	return 'rgba(' + RGB.join(',') + ')'
		// }
	} else {
		// undefined | string
		return RGB
	}
}
