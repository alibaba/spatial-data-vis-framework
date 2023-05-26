/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import Projection from './Projection'

// eslint-disable-next-line no-unused-vars
const MAX_LATITUDE = 85.05112877980659
const DEG2RAD = Math.PI / 180
const R = 6378137

const defaultProps = { center: [0, 0, 0] }

export default class SphereProjection extends Projection {
	protected declare _xyz0: number[]
	private declare R: number

	constructor(props) {
		props = { ...defaultProps, ...props }
		super(props)

		this.R = props.R || R

		this.type = 'SphereProjection'

		this.isSphereProjection = true

		this._xyz0 = projRaw(
			[
				// (center[0]) * DEG2RAD,
				(90 - this.center[0]) * DEG2RAD,
				this.center[1] * DEG2RAD,
			],
			R
		)
	}

	project(lng: number, lat: number, alt = 0): [number, number, number] {
		const lnglatalt = [lng, lat, alt]

		lnglatalt[0] = 90 - lnglatalt[0]
		// lnglatalt[1] = lnglatalt[1]

		lnglatalt[0] *= DEG2RAD
		lnglatalt[1] *= DEG2RAD
		const xyz = projRaw(lnglatalt, this.R)

		// const relativeXYZ = xyz
		// const relativeXYZ = [
		// 	xyz[0],
		// 	xyz[1],
		// 	(xyz[2] || 0) - R,
		// ]

		const x = xyz[0] - this._xyz0[0]
		const y = xyz[1] - this._xyz0[1]
		const z = xyz[2] - this._xyz0[2] || 0

		const scale = this.scale
		if (this._useRightHand) {
			return [x * scale, y * scale, z * scale]
		} else {
			return [x * scale, z * scale, y * scale]
		}
	}

	unproject(x: number, y: number, z: number): [number, number, number] {
		console.error('接口待实现')
		return [0, 0, 0]
	}
}

// console.log('test', new SphereProjection().project([1,0]));

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

	const theta = Math.atan2(y, x)

	// console.log(phi, theta);

	const lng = theta
	const lat = phi

	return [lng, lat, alt]
}

// window.pp = new SphereProjection({
// 	center: [10, 10]
// })

// p = new SphereProjection()
