import { flattenEach } from '@turf/meta'
import { getGeom, getCoords } from '@turf/invariant'
import polygonToLine from '@turf/polygon-to-line'
import earcut from 'earcut'
import { Color } from '@gs.i/utils-math'

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
		const linePositions: number[][] = []
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

export function geomToLinePositions(geom, projection, alt = 0): number[][] | undefined {
	const results: number[][] = []
	if (geom.type === 'LineString') {
		const positions: number[] = []
		const coords = getCoords(geom)
		coords.forEach((coord) => {
			const xyz = projection.project(coord[0], coord[1], alt)
			positions.push(...xyz)
		})
		results.push(positions)
		return results
	} else if (geom.type === 'MultiLineString') {
		const multiCoords: any[] = getCoords(geom)
		multiCoords.forEach((coords) => {
			const positions: number[] = []
			coords.forEach((coord) => {
				const xyz = projection.project(coord[0], coord[1], alt)
				positions.push(...xyz)
			})
			results.push(positions)
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

export function getGenerator(prop: any): (...args: any[]) => any {
	if (typeof prop === 'function') {
		return prop
	}
	return () => prop
}
