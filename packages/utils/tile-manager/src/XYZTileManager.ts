import { Polaris } from '@polaris.gl/schema'
import { CommonTileManager, CommonTileManagerConfig } from './CommonTileManager'
import { lngLatToGoogle, googleToBBox } from 'global-mercator'
import { TileToken } from './types'

export const defaultConfig = {
	viewZoomReduction: 0,
	zoomStep: 1,
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
			_config.viewZoomReduction = Math.floor(_config.viewZoomReduction)
			console.warn(
				`XYZTileManager - viewZoomReduction should be integer, using ${_config.viewZoomReduction}`
			)
		}
		if (_config.zoomStep !== Math.floor(_config.zoomStep)) {
			_config.zoomStep = Math.floor(_config.zoomStep)
			console.warn(`XYZTileManager - tileZoomStep should be integer, using ${_config.zoomStep}`)
		}

		super({
			..._config,
			getViewTiles: (polaris, minZoom, maxZoom) => {
				return getViewTiles(
					polaris,
					minZoom,
					maxZoom,
					this.config.viewZoomReduction,
					this.config.zoomStep
				)
			},
			getParentTileToken,
			getChildTileTokens,
		})
	}
}

const getXYRange = (lnglatMin: number[], lnglatMax: number[], zoom: number) => {
	const xyz0 = lngLatToGoogle(lnglatMin, zoom)
	const xyz1 = lngLatToGoogle(lnglatMax, zoom)
	const xyMin = [Math.min(xyz0[0], xyz1[0]), Math.min(xyz0[1], xyz1[1])]
	const xyMax = [Math.max(xyz0[0], xyz1[0]), Math.max(xyz0[1], xyz1[1])]
	const xMin = xyMin[0]
	const yMin = xyMin[1]
	const xMax = xyMax[0]
	const yMax = xyMax[1]
	return { xMin, yMin, xMax, yMax }
}

const bboxToTiles = (lnglatMin: number[], lnglatMax: number[], zoom: number) => {
	const { xMin, yMin, xMax, yMax } = getXYRange(lnglatMin, lnglatMax, zoom)
	const tileList: [number, number, number][] = []
	for (let x = xMin; x <= xMax; x++) {
		for (let y = yMin; y <= yMax; y++) {
			tileList.push([x, y, zoom])
		}
	}
	return tileList
}

const getViewTiles = (
	polaris: Polaris,
	minZoom: number,
	maxZoom: number,
	viewZoomReduction: number,
	zoomStep: number
) => {
	const geoRange = polaris.getGeoRange()
	const lnglatMin = [Infinity, Infinity]
	const lnglatMax = [-Infinity, -Infinity]

	if (geoRange === undefined) {
		return []
	}

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

	// apply zoom step
	zoom -= (zoom - minZoom) % zoomStep

	const tileList = bboxToTiles(lnglatMin, lnglatMax, zoom)

	// sort tileTokens from view mid to view edge
	// to let the mid view tiles request earlier
	const { xMin, yMin, xMax, yMax } = getXYRange(lnglatMin, lnglatMax, zoom)
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

/**
 * @QianXun performance issue fixed, 10 times faster than the old method.
 */
const getChildTileTokens = (token: TileToken, targetZoom: number) => {
	const inputX = typeof token[0] === 'string' ? parseInt(token[0]) : token[0]
	const inputY = typeof token[1] === 'string' ? parseInt(token[1]) : token[1]
	const inputZ = typeof token[2] === 'string' ? parseInt(token[2]) : token[2]

	targetZoom = Math.floor(targetZoom)

	if (inputZ >= targetZoom) {
		throw new Error('targetZoom should be larger than token[2]')
	}

	const bbox = googleToBBox([inputX, inputY, inputZ])
	const lnglatMin = [bbox[0], bbox[1]]
	const lnglatMax = [bbox[2], bbox[3]]

	const children = bboxToTiles(lnglatMin, lnglatMax, targetZoom)

	return children
}

// const getChildTileTokensOld = (token: TileToken, targetZoom: number) => {
// 	const inputZ = typeof token[2] === 'string' ? parseInt(token[2]) : token[2]
// 	targetZoom = Math.floor(targetZoom)

// 	if (inputZ >= targetZoom) {
// 		throw new Error('targetZoom should be larger than token[2]')
// 	}

// 	const parents: TileToken[] = [token]
// 	const children: TileToken[] = []

// 	while (parents.length) {
// 		const currToken = parents.shift()
// 		if (!currToken) {
// 			break
// 		}

// 		const x = typeof currToken[0] === 'string' ? parseInt(currToken[0]) : currToken[0],
// 			y = typeof currToken[1] === 'string' ? parseInt(currToken[1]) : currToken[1],
// 			z = typeof currToken[2] === 'string' ? parseInt(currToken[2]) : currToken[2]

// 		const childZ = z + 1

// 		if (childZ > targetZoom) {
// 			continue
// 		}

// 		// x => x * 2 + 0/1
// 		// y => y * 2 + 0/1
// 		// z => z + 1
// 		for (let childX = 0; childX <= 1; childX++) {
// 			for (let childY = 0; childY <= 1; childY++) {
// 				const child = [2 * x + childX, 2 * y + childY, childZ]
// 				children.push(child)
// 				parents.push(child)
// 			}
// 		}
// 	}

// 	return children
// }

// // -------------
// // performance test
// // -------------
// const args: any[] = []
// for (let i = 0; i < 100; i++) {
// 	const x = Math.round(Math.random() * 200 - 100) + 1707
// 	const y = Math.round(Math.random() * 200 - 100) + 842
// 	const token = [x, y, 11]
// 	const targetZoom = 18
// 	args.push({
// 		token,
// 		targetZoom,
// 	})
// }

// const n1 = performance.now()
// args.forEach((item) => {
// 	getChildTileTokens(item.token, item.targetZoom)
// })
// const t1 = performance.now() - n1

// const n2 = performance.now()
// args.forEach((item) => {
// 	getChildTileTokensOld(item.token, item.targetZoom)
// })
// const t2 = performance.now() - n2

// console.log('t1', t1)
// console.log('t2', t2)
