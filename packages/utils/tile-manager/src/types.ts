import { STDLayer } from '@polaris.gl/layer-std'
import { MeshDataType } from '@gs.i/schema'

export type TileToken = (number | string)[]

/**
 * TileRenderables
 * @description meshes & sublayers which can be used to render the tile contents
 * @note TileRenderables is provided by user
 */
export type TileRenderables = {
	meshes: MeshDataType[]
	layers: STDLayer[]
}

/**
 * CachedTileRenderables
 * @description the internal cache object used by TileManager
 */
export type CachedTileRenderables = TileRenderables & {
	lastVisTime: number
	key: string
}

/**
 * TileRequest
 * @description the promise that user provide to generate a tile's meshes/sublayers
 * @property the 'promise' object is provided by user to give TileManager a pending with TileRenderables result
 * @property the 'abort' function can be provided to let TileManager to stop the renderables request, if necessary
 * the flag returned by 'abort' function will be used to check if the request was aborted successfully
 * @note the promise should be 'rejected' state after abort operation
 */
export type TilePromise = {
	promise: Promise<TileRenderables>
	abort?: () => { success: boolean }
}

export type CachedTilePromise = {
	key: string
	promise: Promise<TileRenderables>
	outOfViewFrames: number
	abort?: () => { success: boolean }
}

export interface TileManager {
	/**
	 * Start updating tiles
	 */
	start(): void

	/**
	 * Stop updating tiles
	 */
	stop(): void

	/**
	 * Update configs
	 */
	updateConfig(config: any): void

	/**
	 * Get current visible tiles list
	 */
	getVisibleTiles(): CachedTileRenderables[]

	/**
	 * Get current pending (requesting/generating) tiles count
	 */
	getPendingTilesCount(): number

	/**
	 * Get current total count of tiles that should be visible (including tiles being requesting/generating)
	 */
	getVisibleTilesCount(): number

	/**
	 * forEach call for every cached tiles
	 */
	forEachTile(f: (TileRenderables: TileRenderables, index?: number) => any)

	/**
	 * forEach call for every visible tiles
	 */
	forEachVisibleTile(f: (TileRenderables: TileRenderables, index?: number) => any)

	/**
	 * clear all tiles & caches
	 */
	clear(): void

	/**
	 * dispose memory
	 */
	dispose(): void
}
