import { STDLayer } from '@polaris.gl/layer-std'
import { MeshDataType } from '@gs.i/schema'

export type TileToken = (number | string)[]

export type TileRenderables = {
	meshes: MeshDataType[]
	layers: STDLayer[]
}

export type CachedTileRenderables = TileRenderables & {
	lastVisTime: number
	key: string
}

export interface ITileManager {
	/**
	 * Start updating tiles
	 */
	start(): Promise<void>

	/**
	 * Stop updating tiles
	 */
	stop(): Promise<void>

	/**
	 * Get current visible tiles list
	 */
	getVisibleTiles(): CachedTileRenderables[]

	/**
	 * Get current pending (requesting/generating) tiles count
	 */
	getPendingsCount(): number

	/**
	 * forEach call for every cached tiles
	 */
	forEachTile(f: (TileRenderables: TileRenderables, index?: number) => any)

	/**
	 * forEach call for every visible tiles
	 */
	forEachVisibleTile(f: (TileRenderables: TileRenderables, index?: number) => any)

	/**
	 * Dispose
	 */
	dispose(): void
}
