/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/* eslint-disable camelcase */
/**
 * @author Simon
 * （偏轴）方位角等距投影，平面投影，距离中心越近变形越小，适合在平面上投影任意经纬度的地图，小范围内形状准确
 * http://mathworld.wolfram.com/AzimuthalEquidistantProjection.html
 * http://desktop.arcgis.com/zh-cn/arcmap/10.3/guide-books/map-projections/azimuthal-equidistant.htm
 */

import Projection from './Projection'

const DEG2RAD = Math.PI / 180
const R = 6378137

const sin = Math.sin
const cos = Math.cos
// eslint-disable-next-line no-unused-vars
const tan = Math.tan
const acos = Math.acos
const asin = Math.asin
const atan = Math.atan

const defaultProps = { center: [0, 0] }

export default class AzimuthalEquidistantProjection extends Projection {
	private _centerRad: number[]

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
		this._centerRad = [center[0] * DEG2RAD, center[1] * DEG2RAD]
	}

	project(lng: number, lat: number, alt = 0): [number, number, number] {
		const center = this.center

		// 0度检查
		if (Math.abs(lng - center[0]) < 1e-6 && Math.abs(lat - center[1]) < 1e-6) {
			return [0, 0, alt]
		}
		// @TODO  90度检查

		const φ = lat * DEG2RAD
		const λ = lng * DEG2RAD

		const φ0 = this._centerRad[1]
		const λ0 = this._centerRad[0]

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

		if (this._useRightHand) {
			return [x * this.scale, y * this.scale, alt * this.scale]
		} else {
			return [x * this.scale, alt * this.scale, y * this.scale]
		}
	}

	unproject(x: number, y: number, z: number): [number, number, number] {
		if (!this._useRightHand) {
			const tmp = z
			z = y
			y = tmp
		}
		x /= this.scale
		y /= this.scale
		z /= this.scale

		// 0度检查
		if (x === 0 && y === 0) {
			return [0, 0, z]
		}
		// @TODO  90度检查

		x = x / R
		y = y / R

		const φ0 = this._centerRad[1]
		const λ0 = this._centerRad[0]

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
