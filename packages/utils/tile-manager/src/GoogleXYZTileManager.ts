import { STDLayer } from '@polaris.gl/layer-std'
import { Polaris } from '@polaris.gl/schema'
import { CommonTileManager } from './CommonTileManager'
import { TileRenderables, TileToken } from './types'
import { lngLatToGoogle } from 'global-mercator'

export type GoogleXYZTileManagerConfig = {
	/**
	 * layer
	 */
	layer: STDLayer

	/**
	 * 通过tileTokens获取tile可渲染元素的方法
	 */
	getTileRenderables: (
		token: TileToken,
		tileManager: GoogleXYZTileManager
	) => Promise<TileRenderables>
}

export class GoogleXYZTileManager extends CommonTileManager {
	constructor(config: GoogleXYZTileManagerConfig) {
		super({
			...config,
			getViewTiles,
		})
	}
}

const getViewTiles = (polaris: Polaris) => {
	const geoRange = polaris.getGeoRange()
	const lnglatMin = [Infinity, Infinity]
	const lnglatMax = [-Infinity, -Infinity]

	geoRange.forEach((lnglat) => {
		lnglatMin[0] = Math.min(lnglat[0], lnglatMin[0])
		lnglatMin[1] = Math.min(lnglat[1], lnglatMin[1])
		lnglatMax[0] = Math.max(lnglat[0], lnglatMax[0])
		lnglatMax[1] = Math.max(lnglat[1], lnglatMax[1])
	})

	const zoom = Math.floor(polaris.cameraProxy.zoom)
	const xyz0 = lngLatToGoogle(lnglatMin, zoom)
	const xyz1 = lngLatToGoogle(lnglatMax, zoom)

	const xyMin = [Math.min(xyz0[0], xyz1[0]), Math.min(xyz0[1], xyz1[1])]
	const xyMax = [Math.max(xyz0[0], xyz1[0]), Math.max(xyz0[1], xyz1[1])]
	const xMin = xyMin[0]
	const yMin = xyMin[1]
	const xMax = xyMax[0] + 1
	const yMax = xyMax[1] + 1

	const tileList: [number, number, number][] = []
	for (let x = xMin; x < xMax; x++) {
		for (let y = yMin; y < yMax; y++) {
			tileList.push([x, y, zoom])
		}
	}

	return tileList
}
