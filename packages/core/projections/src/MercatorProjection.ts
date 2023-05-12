/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import Projection from './Projection'

const MAX_LATITUDE = 85.05112877980659
const DEG2RAD = Math.PI / 180
const R = 6378137

const defaultProps = { center: [0, 0, 0] }

export default class MercatorProjection extends Projection {
	private declare _xyz0: number[]

	constructor(props) {
		props = { ...defaultProps, ...props }
		super(props)

		this.type = 'MercatorProjection'

		this.isPlaneProjection = true

		this._xyz0 = projRaw([this.center[0] * DEG2RAD, this.center[1] * DEG2RAD])
		this._xyz0.push(this.center[2] || 0)
	}

	project(lng: number, lat: number, alt = 0): [number, number, number] {
		// 加上边界弄成正方形，与Google等地图的投影方式保持一致
		if (lat > MAX_LATITUDE) {
			lat = MAX_LATITUDE
		} else if (lat < -MAX_LATITUDE) {
			lat = -MAX_LATITUDE
		}

		const xy = projRaw([lng * DEG2RAD, lat * DEG2RAD])

		const x = (xy[0] - this._xyz0[0]) * R
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

// Mercator公式
function projRaw(lnglat) {
	return [lnglat[0], Math.log(Math.tan(lnglat[1]) + 1 / Math.cos(lnglat[1]))]
}

function unprojRaw(xy) {
	return [xy[0], Math.atan(Math.sinh(xy[1]))]
}

// import { geoMercator } from 'd3-geo';
// const MAX_LATITUDE = 85.05112877980659;
/**
 * 墨卡托投影，Polaris 默认投影系统
 * width 画布宽度
 * height 画布高度
 * geoCenter 中心经纬度点，默认中心点经纬度为[0, 0]
 * geoScale 缩放
 */
// export default class MercatorProjection {
// 	constructor({width = 500, height = 500, geoCenter = [0, 0], geoScale = 1}) {
// 		this.width = width;
// 		this.height = height;
// 		this.halfWidth = width / 2;
// 		this.halfHeight = height / 2;
// 		this.geoCenter = geoCenter;
//
// 		this.projection = geoMercator()
// 			.scale((width - 3) / (2 * Math.PI) * geoScale)
// 			// .scale(width / Math.PI * scale)  // why ？比例比较合适，正好填满画布
// 			.translate([width / 2, height / 2])
// 			.center(geoCenter);
// 	}
//
// 	// 经纬度转换成 webgl 坐标系的 xy 坐标
// 	project(lnglat = [0, 0]) {
// 		lnglat[1] = Math.min(lnglat[1], MAX_LATITUDE);
// 		lnglat[1] = Math.max(lnglat[1], -MAX_LATITUDE);
// 		const point = this.projection(lnglat);
//
// 		// canvas 坐标系 转换到 webgl 世界坐标系
// 		return [
// 			point[0] - this.halfWidth,
// 			this.halfHeight - point[1],
// 		];
// 	}
//
// 	// webgl 坐标系的 xy 坐标转换成经纬度
// 	unproject(xy = [0, 0]) {
//
// 		return this.projection.invert([
// 			xy[0] + this.halfWidth,
// 			this.halfHeight - xy[1],
// 		]);
// 	}
// }
