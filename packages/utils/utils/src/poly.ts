/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

// import earcut from 'earcut'
// // @TODO 体积过大，需要全部换成按需引入
// // import * as turf from '@turf/turf'
// import { flattenEach } from '@turf/meta'
// import { getGeom, getCoords } from '@turf/invariant'

// export function triangulateGeoJSON(geojson: any): any {
// 	let points: Array<number> = []
// 	let triangles: Array<number> = []

// 	flattenEach(geojson, (feature: any) => {
// 		if (!getGeom(feature)) return

// 		const coords = getCoords(feature)

// 		const data = earcut.flatten(coords)
// 		const _triangles = earcut(data.vertices, data.holes, data.dimensions)

// 		const offset = points.length / data.dimensions

// 		if (offset === 0) {
// 			triangles = _triangles
// 			points = data.vertices
// 		} else {
// 			for (let i = 0; i < _triangles.length; i++) {
// 				triangles.push(_triangles[i] + offset)
// 			}

// 			for (let i = 0; i < data.vertices.length; i++) {
// 				points.push(data.vertices[i])
// 			}
// 		}
// 	})

// 	return {
// 		points,
// 		triangles,
// 	}
// }

export {}
