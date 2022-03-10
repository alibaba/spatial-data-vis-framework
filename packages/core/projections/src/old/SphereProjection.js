/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

const Projection = require('./Projection')

// eslint-disable-next-line no-unused-vars
const MAX_LATITUDE = 85.05112877980659
const DEG2RAD = Math.PI / 180
const R = 6378137

const defaultProps = { center: [0, 0, 0] }

module.exports = class SphereProjection extends Projection {
	constructor(props) {
		props = { ...defaultProps, ...props }
		super(props)

		this.R = props.R || R

		this.type = 'SphereProjection'

		this.isSphereProjection = true
	}

	get center() {
		return this._center
	}

	set center(center) {
		this._center = center
		this._xyz0 = projRaw(
			[
				// (center[0]) * DEG2RAD,
				(90 - center[0]) * DEG2RAD,
				center[1] * DEG2RAD,
			],
			R
		)
	}

	project(lng, lat, alt) {
		let lnglatalt = Array.isArray(lng) ? lng.slice() : [lng, lat, alt]

		// lnglatalt[0] = 90 - lnglatalt[0]
		// let _d = lnglatalt[0] - this._center[0]
		// if (_d > 180) {
		// 	_d -= 360
		// }
		// if (_d < -180) {
		// 	_d += 360
		// }
		// console.log(_d);
		// lnglatalt[0] = 90 - (lnglatalt[0] - this._center[0])
		// lnglatalt[0] = 90 - (lnglatalt[0] - this._center[0])
		// lnglatalt[0] = 90 - (lnglatalt[0] - this._center[0])
		// lnglatalt[0] = (lnglatalt[0] - this._center[0])
		// lnglatalt[1] = (lnglatalt[1] - this._center[1])

		// let _d = lnglatalt[1] - this._center[1]
		// if (_d > 90) {
		// 	_d -= 180
		// }
		// if (_d < -90) {
		// 	_d += 180
		// }
		// console.log(lnglatalt[1] - this._center[1]);
		// console.log(_d);
		// lnglatalt[1] = (_d)
		// lnglatalt[2] = (lnglatalt[2] - this._center[2]) || 0

		lnglatalt[2] = lnglatalt[2] || this.getAlt([lnglatalt[0], lnglatalt[1]]) // 如果未指定海拔或者从希望从 heightMap 读取

		lnglatalt[0] = 90 - lnglatalt[0]
		// lnglatalt[1] = lnglatalt[1]

		lnglatalt[0] *= DEG2RAD
		lnglatalt[1] *= DEG2RAD
		const xyz = projRaw(lnglatalt, this.R)

		// debugger

		// return xyz

		// const relativeXYZ = xyz
		// const relativeXYZ = [
		// 	xyz[0],
		// 	xyz[1],
		// 	(xyz[2] || 0) - R,
		// ]
		const relativeXYZ = [
			xyz[0] - this._xyz0[0],
			xyz[1] - this._xyz0[1],
			xyz[2] - this._xyz0[2] || 0,
		]

		// debugger

		return relativeXYZ
	}

	unproject(x, y, z) {
		console.error('接口待实现')
		return [0, 0, 0]
		// let xyz = Array.isArray(x) ? x : [x, y, z]
		//
		// const lnglatalt = unprojRaw(xyz, this.R)
		// lnglatalt[0] /= DEG2RAD
		// lnglatalt[0] = lnglatalt[0]
		// lnglatalt[1] /= DEG2RAD
		// return lnglatalt
	}
}

// console.log('test', new SphereProjection().project([1,0]));

// Mercator公式
function projRaw(lnglatalt, R) {
	const phi = lnglatalt[0]
	const theta = lnglatalt[1]
	const alt = lnglatalt[2] || 0

	const radius = R + alt

	// console.log(phi, theta);

	return [
		radius * Math.cos(phi) * Math.cos(theta),
		radius * Math.sin(theta),
		radius * Math.sin(phi) * Math.cos(theta),
	]
}

// eslint-disable-next-line no-unused-vars
function unprojRaw(xyz, R) {
	const x = xyz[0]
	const y = xyz[1]
	const z = xyz[2]

	const radius = Math.sqrt(x * x + y * y + z * z)
	const alt = radius - R

	const phi = Math.acos(y / radius)
	// const theta = Math.asin(z / radius / Math.sin( phi ))

	// const tanTheta = z / x
	// let theta = Math.atan(z / x)
	// if (theta !== theta) {
	// 	theta = Math.asin(z / radius / Math.sin( phi ))
	// }

	let theta = Math.atan2(y, x)

	// console.log(phi, theta);

	const lng = theta
	const lat = phi

	return [lng, lat, alt]
}

// window.pp = new SphereProjection({
// 	center: [10, 10]
// })

// p = new SphereProjection()
