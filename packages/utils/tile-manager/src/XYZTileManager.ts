import { Polaris } from '@polaris.gl/schema'
import { CommonTileManager, CommonTileManagerConfig } from './CommonTileManager'
import { lngLatToGoogle } from 'global-mercator'
import { TileToken } from './types'

export const defaultConfig = {
	viewZoomReduction: 0,
	tileZoomStep: 1,
}

export type XYZTileManagerConfig = Omit<
	CommonTileManagerConfig,
	'getViewTiles' | 'getParentTileToken' | 'getChildTileTokens'
> &
	Partial<typeof defaultConfig>

export class XYZTileManager extends CommonTileManager {
	readonly config: CommonTileManagerConfig & Required<XYZTileManagerConfig>

	constructor(config: XYZTileManagerConfig) {
		const _config = {
			...defaultConfig,
			...config,
		}
		if (_config.viewZoomReduction !== Math.floor(_config.viewZoomReduction)) {
			console.warn('XYZTileManager - viewZoomReduction should be int number. ')
			_config.viewZoomReduction = Math.floor(_config.viewZoomReduction)
		}
		if (_config.tileZoomStep !== Math.floor(_config.tileZoomStep)) {
			console.warn('XYZTileManager - tileZoomStep should be int number. ')
			_config.tileZoomStep = Math.floor(_config.tileZoomStep)
		}

		super({
			..._config,
			getViewTiles: (polaris, minZoom, maxZoom) => {
				return getViewTiles(
					polaris,
					minZoom,
					maxZoom,
					this.config.viewZoomReduction,
					this.config.tileZoomStep
				)
			},
			getParentTileToken,
			getChildTileTokens,
		})
	}
}

const getViewTiles = (
	polaris: Polaris,
	minZoom: number,
	maxZoom: number,
	viewZoomReduction: number,
	tileZoomStep: number
) => {
	const geoRange = polaris.getGeoRange()
	const lnglatMin = [Infinity, Infinity]
	const lnglatMax = [-Infinity, -Infinity]

	geoRange.forEach((lnglat) => {
		lnglatMin[0] = Math.min(lnglat[0], lnglatMin[0])
		lnglatMin[1] = Math.min(lnglat[1], lnglatMin[1])
		lnglatMax[0] = Math.max(lnglat[0], lnglatMax[0])
		lnglatMax[1] = Math.max(lnglat[1], lnglatMax[1])
	})

	let zoom = Math.floor(polaris.cameraProxy.zoom)
	zoom = Math.min(Math.max(minZoom, zoom), maxZoom)

	// apply zoom reduction
	viewZoomReduction = Math.min(Math.max(0, viewZoomReduction), zoom - 1)
	zoom -= viewZoomReduction

	// @TODO apply zoom step
	// const zoomStep = Math.floor(viewZoomReduction)

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

	// sort tileTokens from view mid to view edge
	// to let the mid view tiles request earlier
	const mid = [(xMin + xMax) * 0.5, (yMin + yMax) * 0.5]
	tileList.sort(
		(a, b) =>
			manhattanDistance([a[0] + 0.5, a[1] + 0.5], mid) -
			manhattanDistance([b[0] + 0.5, b[1] + 0.5], mid)
	)

	return tileList
}

const manhattanDistance = (a: number[], b: number[]) => {
	return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])
}

const getParentTileToken = (token: TileToken) => {
	const x = typeof token[0] === 'string' ? parseInt(token[0]) : token[0],
		y = typeof token[1] === 'string' ? parseInt(token[1]) : token[1],
		z = typeof token[2] === 'string' ? parseInt(token[2]) : token[2]
	// x => floor(x/2)
	// y => floor(y/2)
	// z => z-1
	const parentX = Math.floor(x * 0.5)
	const parentY = Math.floor(y * 0.5)
	const parentZ = z - 1
	if (parentZ < 0) return undefined
	return [parentX, parentY, parentZ]
}

const getChildTileTokens = (token: TileToken, targetZoom: number) => {
	const inputZ = typeof token[2] === 'string' ? parseInt(token[2]) : token[2]
	targetZoom = Math.floor(targetZoom)

	if (inputZ >= targetZoom) {
		throw new Error('targetZoom should be larger than token[2]')
	}

	const parents: TileToken[] = [token]
	const children: TileToken[] = []

	while (parents.length) {
		const currToken = parents.shift()
		if (!currToken) {
			continue
		}

		const x = typeof currToken[0] === 'string' ? parseInt(currToken[0]) : currToken[0],
			y = typeof currToken[1] === 'string' ? parseInt(currToken[1]) : currToken[1],
			z = typeof currToken[2] === 'string' ? parseInt(currToken[2]) : currToken[2]

		const childZ = z + 1

		if (childZ > targetZoom) {
			continue
		}

		// x => x * 2 + 0/1
		// y => y * 2 + 0/1
		// z => z + 1
		for (let childX = 0; childX <= 1; childX++) {
			for (let childY = 0; childY <= 1; childY++) {
				const child = [2 * x + childX, 2 * y + childY, childZ]
				children.push(child)
				parents.push(child)
			}
		}
	}

	return children
}
