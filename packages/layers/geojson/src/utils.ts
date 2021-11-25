/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Color } from '@gs.i/utils-math'
import earcut from 'earcut'
// @TODO 体积过大，需要全部换成按需引入
// import * as turf from '@turf/turf'
import { flattenEach } from '@turf/meta'
import { getGeom, getCoords } from '@turf/invariant'
import bbox from '@turf/bbox'

import inside from 'point-in-polygon'
// import classifyPoint from 'robust-point-in-polygon'

// jsts
import ConformingDelaunayTriangulationBuilder from 'jsts/org/locationtech/jts/triangulate/ConformingDelaunayTriangulationBuilder'
import GeometryFactory from 'jsts/org/locationtech/jts/geom/GeometryFactory'
import Coordinate from 'jsts/org/locationtech/jts/geom/Coordinate'

export function triangulateGeoJSON(geojson: any): any {
	let points: Array<number> = []
	let triangles: Array<number> = []

	flattenEach(geojson, (feature: any) => {
		if (!getGeom(feature)) return

		const coords = getCoords(feature)

		const data = earcut.flatten(coords)
		const _triangles = earcut(data.vertices, data.holes, data.dimensions)

		const offset = points.length / data.dimensions

		if (offset === 0) {
			triangles = _triangles
			points = data.vertices
		} else {
			for (let i = 0; i < _triangles.length; i++) {
				triangles.push(_triangles[i] + offset)
			}

			for (let i = 0; i < data.vertices.length; i++) {
				points.push(data.vertices[i])
			}
		}
	})

	return {
		points,
		triangles,
	}
}

// 带细分的CDT三角化
export function CDTGeojsonWithSubdivision(data, subdivision): any {
	// console.log('CDTGeojsonWithSubdivision start')
	let points: number[] = []
	let triangles: number[] = []
	let steiners: number[][] = []
	// let lnglats = []

	// 这个会拆掉所有的multiGeom，拆成不同的feature
	// const _t = performance.now()
	// console.time('细分')
	flattenEach(data, (feature) => {
		const geom = getGeom(feature)

		if (!geom) return
		// feature = turf.cleanCoords(feature)

		if (!feature.properties) return

		const coords = getCoords(feature)

		// 与地球的细分对齐，进行差点
		const dLng = 360 / subdivision
		const dLat = 360 / subdivision
		// https://tools.ietf.org/html/rfc7946#section-5
		const _bbox = bbox(feature)
		// 左边界（最小经度）
		const left = Math.floor(_bbox[0] / dLng)
		// 下边界
		const btm = Math.floor(_bbox[1] / dLat)
		// 右边界（最大经度）
		const right = Math.ceil(_bbox[2] / dLng)
		// 上边界
		const top = Math.ceil(_bbox[3] / dLat)

		// https://en.wikipedia.org/wiki/Steiner_point
		const steinerPoints: number[][] = []
		for (let i = left; i <= right; i++) {
			for (let j = btm; j <= top; j++) {
				const lnglat = [i * dLng, j * dLat]
				if (pointInsidePolygon(lnglat, coords)) {
					steinerPoints.push(lnglat)
				}
			}
		}

		// debugger

		// console.log('细分固定点', steinerPoints.length);

		// console.log(steinerPoints);

		// console.time('CDTtriangulate');
		const { triangles: _triangles, points: _points } = CDTtriangulate(coords, steinerPoints)
		// console.timeEnd('CDTtriangulate');

		const offset = points.length / 2

		if (offset === 0) {
			triangles = _triangles
			points = _points
			steiners = steinerPoints
		} else {
			for (let i = 0; i < _triangles.length; i++) {
				triangles.push(_triangles[i] + offset)
			}

			for (let i = 0; i < _points.length; i++) {
				points.push(_points[i])
			}

			for (let i = 0; i < steinerPoints.length; i++) {
				steiners.push(steinerPoints[i])
			}
		}
	})
	// console.log('CDTGeojsonWithSubdivision end')
	return {
		points,
		triangles,
		steiners,
	}
}

/**
 * @param  {Array<[Num:x, Num:y]>} boundary      外边界
 * @param  {Array<[Num:x, Num:y]>} steinerPoints 内差点
 * @return {{triangles<[a,b,c, a,b,c, ...], points<[[x,y], [x,y]]>>}}
 */
// https://blog.csdn.net/cdl2008sky/article/details/7268577
const geomFact = new GeometryFactory()
export function CDTtriangulate(boundaries, steinerPoints) {
	const boundary = boundaries[0]
	// console.log(boundary.length + steinerPoints.length);
	const builder = new ConformingDelaunayTriangulationBuilder()
	// 阈值
	builder.setTolerance(0)
	// 顶点们 (不包含限制边)
	// builder.setSites(Geometry geom)
	// @NOTE 不能用 MultiPoint 会报错
	steinerPoints = [boundary[0], boundary[1], ...steinerPoints]
	// steinerPoints.push(boundary[0], boundary[1])
	// const sites = geomFact.createMultiPoint(steinerPoints.map((p, index) => {
	const sites = geomFact.createLineString(steinerPoints.map((p) => new Coordinate(...p)))
	// const sites = geomFact.createGeometryCollection([_sites])
	builder.setSites(sites)
	// 限制边
	// builder.setConstraints(Geometry constraintLines)
	const shell = geomFact.createLinearRing(boundary.map((p) => new Coordinate(...p)))
	const holes: any = []
	for (let i = 1; i < boundaries.length; i++) {
		const holeBoundary = boundaries[i]
		const hole = geomFact.createLinearRing(holeBoundary.map((p) => new Coordinate(...p)))
		holes.push(hole)
	}
	const constraintLines = geomFact.createPolygon(shell, holes)
	builder.setConstraints(constraintLines)
	// 获取三角形
	const _triangles = builder.getTriangles(geomFact)

	// debugger

	const triangles: number[] = []
	const points: number[] = []
	// @WARNNING @NOTE java接口太麻烦了，接下来开始破坏封装
	let index = 0
	_triangles._geometries.forEach((polygon) => {
		const ps = polygon._shell._points._coordinates
		const center = [(ps[0].x + ps[1].x + ps[2].x) / 3, (ps[0].y + ps[1].y + ps[2].y) / 3]
		if (!pointInsidePolygon(center, boundaries)) {
			return
		}

		points.push(ps[0].x, ps[0].y)
		points.push(ps[1].x, ps[1].y)
		points.push(ps[2].x, ps[2].y)

		triangles.push(index * 3 + 0)
		triangles.push(index * 3 + 1)
		triangles.push(index * 3 + 2)
		index++
	})

	return {
		triangles,
		points,
	}
}

const R2D = 180 / Math.PI
const D2R = Math.PI / 180

export function pointInsidePolygon(point, boundaries) {
	if (!boundaries[0][0][0]) {
		boundaries = [boundaries]
	}

	// [
	// 		[ring [], [], []],
	// 		[hole [], []],
	// ]

	const boundary = boundaries[0]
	// const A = inside(point, polygon)
	// const B = classifyPoint(polygon, point)
	// console.log(A, B);

	if (!inside(point, boundary)) {
		return false
	}
	for (let i = 1; i < boundaries.length; i++) {
		const holeBoundary = boundaries[i]
		if (inside(point, holeBoundary)) {
			return false
		}
	}
	return true
	// @NOTE 这个方法相对于 point-in-polygon 的优势是可以排除 落在边界上的点
	// 这两个都不支持hole
	// https://www.npmjs.com/package/robust-point-in-polygon
	// return classifyPoint(polygon, point) === -1
}

export function getColorUint(color: Color, alpha?: number): Uint32Array {
	if (alpha !== undefined) {
		return new Uint32Array([
			Math.round(color.r * 255),
			Math.round(color.g * 255),
			Math.round(color.b * 255),
			Math.round(alpha * 255),
		])
	} else {
		return new Uint32Array([
			Math.round(color.r * 255),
			Math.round(color.g * 255),
			Math.round(color.b * 255),
		])
	}
}

export function getFeatureStringKey(feature: any, keyDesc: string): string {
	const keys = keyDesc.split('.')
	let curr = feature
	while (keys.length > 0) {
		const key = keys.shift()
		if (key && curr) {
			curr = curr[key]
		}
	}
	return curr.toString()
}
