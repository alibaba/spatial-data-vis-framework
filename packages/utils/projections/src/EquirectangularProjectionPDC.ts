/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import Projection from './Projection'

const MAX_LATITUDE = 90
const DEG2RAD = Math.PI / 180
const R = 6378137

const PI2 = Math.PI * 2
const EDGE_LNG = -26 * DEG2RAD
const EDGE_LNG1 = -10 * DEG2RAD
const EDGE_LAT = 68 * DEG2RAD
const OFFSET_LNG = Math.PI + EDGE_LNG

const defaultProps = { center: [0, 0, 0], ratio: 1 }

export default class EquirectangularProjection extends Projection {
	private _xyz0: number[]
	private ratio: number

	constructor(props) {
		props = { ...defaultProps, ...props }
		super(props)

		this.type = 'EquirectangularProjectionPDC'

		this.ratio = props.ratio

		this.isPlaneProjection = true
	}

	get center() {
		return this._center
	}

	set center(center) {
		this._center = center
		this._xyz0 = projRaw([center[0] * DEG2RAD, center[1] * DEG2RAD])

		this._xyz0.push(center[2] || 0)
	}

	project(lng: number, lat: number, alt = 0): [number, number, number] {
		// 加上边界弄成正方形，与Google等地图的投影方式保持一致
		if (lat > MAX_LATITUDE) {
			lat = MAX_LATITUDE
		} else if (lat < -MAX_LATITUDE) {
			lat = -MAX_LATITUDE
		}

		const xy = projRaw([lng * DEG2RAD, lat * DEG2RAD])

		const x = (xy[0] - this._xyz0[0]) * R * this.ratio
		const y = (xy[1] - this._xyz0[1]) * R
		const z = alt - this._xyz0[2] || 0

		const scale = this.scale
		if (this._useRightHand) {
			return [x * scale, y * scale, z * scale]
		} else {
			return [x * scale, z * scale, y * scale]
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

		const xy = [x / R + this._xyz0[0], y / R + this._xyz0[1]]

		let lnglat = unprojRaw(xy)
		return [lnglat[0] / DEG2RAD, lnglat[1] / DEG2RAD, z + this._xyz0[2] || 0]
	}
}

function projRaw(lnglat) {
	// !!!!!!! 经纬度偏移，使得太平洋为中心
	lnglat = offset(lnglat[0], lnglat[1])
	return [lnglat[0], lnglat[1]]
}

function unprojRaw(xy) {
	// !!!!!!! 经纬度反偏移
	xy = reoffset(xy[0], xy[1])
	return [xy[0], xy[1]]
}

function offset(lng, lat) {
	if (lng < EDGE_LNG || (lng < EDGE_LNG1 && lat > EDGE_LAT)) {
		lng = lng - OFFSET_LNG + PI2
	} else {
		lng = lng - OFFSET_LNG
	}

	return [lng, lat]
}

function reoffset(lng, lat) {
	if (lng > -EDGE_LNG) {
		lng -= PI2
	}
	lng = lng + OFFSET_LNG
	return [lng, lat]
}
