/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

const Projection = require('./Projection')

const MAX_LATITUDE = 90
const DEG2RAD = Math.PI / 180
const R = 6378137

const defaultProps = { center: [0, 0, 0] }

module.exports = class EquirectangularProjection extends Projection {
	constructor(props) {
		props = { ...defaultProps, ...props }
		super(props)

		this.type = 'EquirectangularProjection'

		this.ratio = props.ratio || 1

		this.isPlaneProjection = true
	}

	get center() {
		return this._center
	}

	set center(center) {
		this._center = center
		this._xyz0 = this.projRaw([center[0] * DEG2RAD, center[1] * DEG2RAD])

		this._xyz0.push(center[2] || 0)
	}

	project(lng, lat, alt) {
		let lnglat = Array.isArray(lng) ? lng.slice() : [lng, lat, alt]

		// 如果未指定海拔或者从希望从 heightMap 读取
		lnglat[2] = lnglat[2] || this.getAlt([lnglat[0], lnglat[1]])

		// 加上边界弄成正方形，与Google等地图的投影方式保持一致
		if (lnglat[1] > MAX_LATITUDE) {
			lnglat[1] = MAX_LATITUDE
		} else if (lnglat[1] < -MAX_LATITUDE) {
			lnglat[1] = -MAX_LATITUDE
		}

		const xy = this.projRaw([lnglat[0] * DEG2RAD, lnglat[1] * DEG2RAD])

		const relativeXY = [
			(xy[0] - this._xyz0[0]) * R * this.ratio,
			(xy[1] - this._xyz0[1]) * R,
			lnglat[2] - this._xyz0[2] || 0,
		]

		return relativeXY
	}

	unproject(x, y, z) {
		let xy = Array.isArray(x) ? x : [x, y, z]
		xy = [xy[0] / R + this._xyz0[0], xy[1] / R + this._xyz0[1]]

		let lnglat = this.unprojRaw(xy)
		lnglat = [lnglat[0] / DEG2RAD, lnglat[1] / DEG2RAD, xy[2] + this._xyz0[2] || 0]

		// // 高度
		// if (xy[2] !== undefined) {
		// 	lnglat.push(xy[2])
		// }

		return lnglat
	}

	projRaw(lnglat) {
		return [lnglat[0], lnglat[1]]
	}

	unprojRaw(xy) {
		return [xy[0], xy[1]]
	}
}

Math.sinh =
	Math.sinh ||
	function(x) {
		return (Math.exp(x) - Math.exp(-x)) / 2
	}
