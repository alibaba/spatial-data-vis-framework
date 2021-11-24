/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/* eslint-disable camelcase */
/**
 * @author Simon
 * （偏轴）方位角等距投影，平面投影，距离中心越近变形越小，适合在平面上投影任意经纬度的地图，小范围内形状准确
 * @TODO 90°极端情况处理
 * http://mathworld.wolfram.com/AzimuthalEquidistantProjection.html
 * http://desktop.arcgis.com/zh-cn/arcmap/10.3/guide-books/map-projections/azimuthal-equidistant.htm
 */

const Projection = require('./Projection')

const DEG2RAD = Math.PI / 180
const R = 6378137

const defaultProps = { center: [0, 0, 0] }

const sin = Math.sin
const cos = Math.cos
// eslint-disable-next-line no-unused-vars
const tan = Math.tan
const acos = Math.acos
const asin = Math.asin
const atan = Math.atan

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/EPSILON#Specifications
if (Number.EPSILON === undefined) {
	Number.EPSILON = Math.pow(2, -52)
}

// @TODO  90度极端情况处理

module.exports = class AzimuthalEquidistantProjection extends Projection {
	constructor(props) {
		props = { ...defaultProps, ...props }
		super(props)

		this.type = 'AzimuthalEquidistantProjection'

		this.isPlaneProjection = true
	}

	get center() {
		return this._center
	}

	set center(center) {
		this._center = center
	}

	project(lng, lat, alt) {
		let lnglat = Array.isArray(lng) ? lng.slice() : [lng, lat, alt]
		// 如果未指定海拔或者从希望从 heightMap 读取
		lnglat[2] = lnglat[2] || this.getAlt([lnglat[0], lnglat[1]])
		alt = lnglat[2]
		const center = this.center

		if (Math.abs(lnglat[0] - center[0]) < 1e-6 && Math.abs(lnglat[1] - center[1]) < 1e-6) {
			return [0, 0, alt]
		}

		const φ = lnglat[1] * DEG2RAD
		const λ = lnglat[0] * DEG2RAD

		const φ0 = center[1] * DEG2RAD
		const λ0 = center[0] * DEG2RAD

		const sin_φ0 = sin(φ0)
		const sin_φ = sin(φ)
		const cos_φ0 = cos(φ0)
		const cos_φ = cos(φ)
		const cos_λ_λ0 = cos(λ - λ0)

		const c = acos(sin_φ0 * sin_φ + cos_φ0 * cos_φ * cos_λ_λ0)

		const k = c / sin(c)

		const x = R * k * cos_φ * sin(λ - λ0)
		const y = R * k * (cos_φ0 * sin_φ - sin_φ0 * cos_φ * cos_λ_λ0)

		// debugger
		// if (Number.isNaN(x)) { debugger }
		return [x, y, alt]
	}

	unproject(x, y, z) {
		let xy = Array.isArray(x) ? x : [x, y, z]

		if (xy[0] === 0 && xy[1] === 0) {
			return [0, 0, z]
		}

		x = xy[0] / R
		y = xy[1] / R

		const φ0 = this.center[1] * DEG2RAD
		const λ0 = this.center[0] * DEG2RAD

		const c = Math.sqrt(x * x + y * y)

		const λ = λ0 + atan((x * sin(c)) / (c * cos(φ0) * cos(c) - y * sin(φ0) * sin(c)))

		const φ = asin(cos(c) * sin(φ0) + (y * sin(c) * cos(φ0)) / c)

		// console.log(
		// 	λ / DEG2RAD,
		// 	φ / DEG2RAD,
		// );

		return [λ / DEG2RAD, φ / DEG2RAD, z]
	}
}

// const azimuthalEquidistantRaw = azimuthalRaw(function(c) {
// 	return (c = acos(c)) && c / sin(c);
// }
//
// function azimuthalEquidistantRaw(x, y) {
// 	const scale = c => (c = acos(c)) && c / sin(c)
// 	var cx = cos(x),
// 		cy = cos(y),
// 		k = scale(cx * cy);
// 	return [
// 	  k * cy * sin(x),
// 	  k * sin(y)
// 	];
// }
//
// function azimuthalRaw(scale) {
//   return function(x, y) {
//
//   }
// }
//
// function azimuthalInvert(angle) {
//   return function(x, y) {
//     var z = sqrt(x * x + y * y),
//         c = angle(z),
//         sc = sin(c),
//         cc = cos(c);
//     return [
//       atan2(x * sc, z * cc),
//       asin(z && y * sc / z)
//     ];
//   }
// }
//
