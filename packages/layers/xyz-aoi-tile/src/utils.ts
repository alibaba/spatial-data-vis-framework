import { flattenEach } from '@turf/meta'
import { getGeom, getCoords } from '@turf/invariant'
import polygonToLine from '@turf/polygon-to-line'
import earcut from 'earcut'

export function getFeatureTriangles(feature: any, projection: any, baseAlt: number) {
	const { points, triangles } = triangulateGeoJSON(feature)
	const count = points.length / 2
	const positions = new Float32Array(count * 3)
	const indices = new Uint32Array(triangles)
	let offset = 0
	for (let i = 0; i < points.length; i += 2) {
		const xyz = projection.project(points[i], points[i + 1], baseAlt)
		positions[offset + 0] = xyz[0]
		positions[offset + 1] = xyz[1]
		positions[offset + 2] = xyz[2]
		offset += 3
	}

	return {
		positions,
		indices,
	}
}

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

export function featureToLinePositions(feature, projection, alt = 0) {
	let geom: any = getGeom(feature)
	if (geom) {
		const linePositions: Float32Array[] = []
		// 如果Geojson数据是Polygon类型，需要先转换为LineString
		if (geom.type === 'Polygon') {
			const line: any = polygonToLine(feature)
			geom = getGeom(line)
			const positionsArr = geomToLinePositions(geom, projection, alt)
			positionsArr?.forEach((positions) => {
				linePositions.push(positions)
			})
		} else if (geom.type === 'MultiPolygon') {
			const line: any = polygonToLine(feature)
			line.features.forEach((feature) => {
				geom = feature.geometry
				const positionsArr = geomToLinePositions(geom, projection, alt)
				positionsArr?.forEach((positions) => {
					linePositions.push(positions)
				})
			})
		} else if (geom.type === 'LineString' || geom.type === 'MultiLineString') {
			const positionsArr = geomToLinePositions(geom, projection, alt)
			positionsArr?.forEach((positions) => {
				linePositions.push(positions)
			})
		} else {
			return
		}
		return linePositions
	}

	return
}

export function geomToLinePositions(geom, projection, alt = 0) {
	const results: Float32Array[] = []
	if (geom.type === 'LineString') {
		const positions: number[] = []
		const coords = getCoords(geom)
		coords.forEach((coord) => {
			const xyz = projection.project(coord[0], coord[1], alt)
			positions.push(...xyz)
		})
		results.push(new Float32Array(positions))
		return results
	} else if (geom.type === 'MultiLineString') {
		const multiCoords: any[] = getCoords(geom)
		multiCoords.forEach((coords) => {
			const positions: number[] = []
			coords.forEach((coord) => {
				const xyz = projection.project(coord[0], coord[1], alt)
				positions.push(...xyz)
			})
			results.push(new Float32Array(positions))
		})
		return results
	} else {
		console.error('PolygonLayer - Geojson geom type is not valid', geom.type, geom)
		return
	}
}

export function createRangeArray(start: number, end: number) {
	start = Math.max(0, start)
	end = Math.max(0, end)
	const max = Math.max(start, end)
	if (max < 256) {
		return new Uint8Array([start, end])
	} else if (max < 65536) {
		return new Uint16Array([start, end])
	} else {
		return new Uint32Array([start, end])
	}
}

export type OptionalDefault<TFull extends Record<string, any>, TDefault extends TFull> = Omit<
	TFull,
	keyof TDefault
> &
	Partial<TDefault>

export type RequireDefault<TFull extends Record<string, any>, TDefault extends TFull> = {
	[K in keyof TFull]: K extends keyof TDefault ? Exclude<TFull[K], undefined> : TFull[K]
}

export function functionlize<T extends string | number | boolean>(v: ((...args) => T) | T) {
	if (typeof v === 'function') {
		return v
	} else {
		return () => v
	}
}
