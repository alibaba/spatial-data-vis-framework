/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import SphereProjection from './SphereProjection'

/**
 * 地心投影（始终以地心为000的 SphereProjection，无 center）
 */
export default class GeocentricProjection extends SphereProjection {
	constructor(props = {} as any) {
		super({ ...props, center: [0, 0] })

		if (props.center && (props.center[0] !== 0 || props.center[1] !== 0))
			console.warn('GeocentricProjection does not support custom center')

		this._xyz0 = [0, 0, 0]

		this.type = 'GeocentricProjection'

		this.isGeocentricProjection = true
	}
}
