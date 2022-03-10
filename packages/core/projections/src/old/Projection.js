/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

module.exports = class Projection {
	constructor(props) {
		this._center = []

		this.type = 'Projection'

		this.center = props.center

		if (props.altitudeImg) {
			this.altitudeImgData = covertImg2CanvasData(props.altitudeImg)
			this.altitudeScale = props.altitudeScale || 1
			this.altitudeBounds = props.altitudeBounds || [-180, 180, -90, 90]
			this.deltaLng = this.altitudeBounds[1] - this.altitudeBounds[0]
			this.deltaLat = this.altitudeBounds[3] - this.altitudeBounds[2]
		}
	}

	project(xyz) {
		return xyz
	}
	unproject(lla) {
		return lla
	}

	getAlt(ll) {
		if (this.altitudeImgData) {
			// const u = 0.5 + ll[0] / 360 //   (lng + 180) / 360;
			// const v = 0.5 - ll[1] / 180 //    1 - (lat + 90) / 180    // flpY，反转 Y
			const u = (ll[0] - this.altitudeBounds[0]) / this.deltaLng
			const v = 1 - (ll[1] - this.altitudeBounds[2]) / this.deltaLat
			return getPixelFromCanvasData(this.altitudeImgData, u, v).r * this.altitudeScale
		}
		return 0
	}

	llEqualTo(projection) {
		return this._center[0] === projection._center[0] && this._center[1] === projection._center[1]
	}
}

/**
 * 海拔灰度图片=> canvas，方便按 uv 读取像素值
 *
 * @param  {[type]} img [description]
 * @return {[type]}     [description]
 */
function covertImg2CanvasData(img) {
	const width = img.width
	const height = img.height
	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height

	const context = canvas.getContext('2d')
	// const size = width * height
	// const data = new Float32Array(size)
	context.drawImage(img, 0, 0)

	return context.getImageData(0, 0, width, height)
}

/**
 * 根据 uv, 从 canvas 中获取像素值
 *
 * @param {Object} imgData context.getImageData(0, 0, width, height) 返回的对象
 * @param {Float} u 0~1
 * @param {Float} v 0~1
 */
function getPixelFromCanvasData(imgData, u, v) {
	const tx = Math.min((emod(u, 1) * imgData.width) | 0, imgData.width - 1)
	const ty = Math.min((emod(v, 1) * imgData.height) | 0, imgData.height - 1)
	const offset = (ty * imgData.width + tx) * 4
	const r = imgData.data[offset + 0]
	const g = imgData.data[offset + 1]
	const b = imgData.data[offset + 2]
	const a = imgData.data[offset + 3]

	return {
		r,
		g,
		b,
		a,
	}
}

function emod(n, m) {
	return ((n % m) + m) % m
}
