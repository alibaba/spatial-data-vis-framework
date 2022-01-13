/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

export class WrongDescError extends Error {}
export class WrongPropsError extends Error {}

// 投影关键描述
export interface ProjectionDesc {
	type: string
	orientation: string
	units: string
	center: number[]
}

export interface ProjectionProps {
	orientation: string
	units: string
	center: number[]
}

export default class Projection {
	type: string
	orientation: string
	units: string

	isPlaneProjection: boolean
	isSphereProjection: boolean
	isGeocentricProjection: boolean

	protected _useRightHand: boolean
	protected _center: number[]

	protected scale: number

	constructor(props: ProjectionProps) {
		this.type = 'Projection'

		this._center = []

		this.center = props.center

		this.orientation = props.orientation || 'right'
		this._useRightHand = this.orientation === 'right'

		this.units = props.units || 'meters'

		this.scale = this.units === 'kilometers' ? 0.001 : 1
	}

	get center() {
		return this._center
	}

	set center(center) {
		this._center = center
	}

	// 经纬度（海拔）投影为三维坐标
	project(lng: number, lat: number, alt = 0): [number, number, number] {
		return [lng, lat, alt]
	}

	// 三维坐标投影为经纬度（海拔）
	unproject(x: number, y: number, z: number): [number, number, number] {
		return [x, y, z]
	}

	// 用于相似性判断
	llEqualTo(projection: Projection): boolean {
		return this._center[0] === projection._center[0] && this._center[1] === projection._center[1]
	}

	//
	toDesc(): string {
		//  0 version | 1 Type | 2 Orientation | 3 Units | 4 Center
		return (
			`desc0|${this.type}|${this.orientation}|${this.units}|` +
			`${this.center[0]},${this.center[1]},${this.center.length > 2 ? this.center[2] : 0}`
		)
	}
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/EPSILON#Specifications
// https://stackoverflow.com/questions/45006227/typescript-cant-assign-property-after-undefined-check
const _Number = Number as any
if (_Number.EPSILON === undefined) {
	_Number.EPSILON = Math.pow(2, -52)
}

Math.sinh =
	Math.sinh ||
	function (x) {
		return (Math.exp(x) - Math.exp(-x)) / 2
	}
