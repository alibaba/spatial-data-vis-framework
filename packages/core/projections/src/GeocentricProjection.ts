/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import SphereProjection from './SphereProjection'

/**
 * 地心投影（始终以地心为000的 SphereProjection，无 center）
 */
export default class GeocentricProjection extends SphereProjection {
	constructor(props) {
		super(props)

		this._xyz0 = [0, 0, 0]

		this.type = 'GeocentricProjection'

		this.isGeocentricProjection = true
	}

	get center() {
		return [0, 0]
	}

	set center(center) {}
}
