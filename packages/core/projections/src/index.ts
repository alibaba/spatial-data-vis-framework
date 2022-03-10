/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import Projection, {
	ProjectionProps,
	ProjectionDesc,
	WrongDescError,
	WrongPropsError,
} from './Projection'
import AzimuthalEquidistantProjection from './AzimuthalEquidistantProjection'
import MercatorProjection from './MercatorProjection'
import EquirectangularProjection from './EquirectangularProjection'
import EquirectangularProjectionPDC from './EquirectangularProjectionPDC'
import GallStereoGraphicProjection from './GallStereoGraphicProjection'
import SphereProjection from './SphereProjection'
import GeocentricProjection from './GeocentricProjection'

export function createFromDesc(str: string): Projection {
	try {
		const desc: string[] = str.split('|')
		const version = desc[0]
		const type = desc[1]
		const orientation = desc[2]
		const units = desc[3]
		const centerStr = desc[4]
		const centerLLA = centerStr.split(',')
		const center = [
			(centerLLA[0] as unknown as number) - 0,
			(centerLLA[1] as unknown as number) - 0,
			(centerLLA[2] as unknown as number) - 0,
		]

		return createProjection(type, center, units, orientation)
	} catch (error) {
		throw new WrongDescError('Failed to parse the desc: ' + str)
	}
}

export function createProjection(
	type: string,
	center: number[],
	units: string = 'meters',
	orientation: string = 'right'
): Projection {
	const props: ProjectionProps = { center, units, orientation }

	switch (type) {
		case 'GeocentricProjection':
			return new GeocentricProjection(props)
		case 'EquirectangularProjection':
			return new EquirectangularProjection(props)
		case 'EquirectangularProjectionPDC':
			return new EquirectangularProjectionPDC(props)
		case 'AzimuthalEquidistantProjection':
			return new AzimuthalEquidistantProjection(props)
		case 'GallStereoGraphicProjection':
			return new GallStereoGraphicProjection(props)
		case 'SphereProjection':
			return new SphereProjection(props)
		case 'MercatorProjection':
			return new MercatorProjection(props)

		default:
			throw new WrongPropsError('Unsupported projection type: ' + type)
	}
}

// 判断两个投影之间是否是可以通过简单变换得到的
export function isSimilarProjections(p0, p1) {
	return (
		(p0.type === 'MercatorProjection' && p1.type === p0.type) ||
		(p0.isSphereProjection && p1.isSphereProjection) ||
		(p0.type === 'EquirectangularProjection' && p1.type === p0.type)
	)
}

export {
	AzimuthalEquidistantProjection,
	MercatorProjection,
	EquirectangularProjection,
	EquirectangularProjectionPDC,
	GallStereoGraphicProjection,
	SphereProjection,
	GeocentricProjection,
	Projection,
}
