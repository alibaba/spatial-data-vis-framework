import { STDLayer } from '@polaris.gl/layer-std'
import { Polaris } from '@polaris.gl/schema'
import { Projection } from '@polaris.gl/projection'
import { promiseAny } from '@polaris.gl/utils'
import { ITileManager, TileRenderables, TileToken } from './types'

export type CommonTileManagerConfig = {
	/**
	 * layer
	 */
	layer: STDLayer

	/**
	 * 从当前View中获取tileToken list的方法
	 */
	getViewTiles: (polaris: Polaris) => TileToken[]

	/**
	 * 通过tileTokens获取tile可渲染元素的方法
	 */
	getTileRenderables: (token: TileToken, tileManager: CommonTileManager) => Promise<TileRenderables>
}

export class CommonTileManager implements ITileManager {
	readonly config: CommonTileManagerConfig
	private _tileMap: Map<string, TileRenderables>
	private _promiseMap: Map<string, Promise<any>>
	private _currVisibleTiles: TileRenderables[]

	constructor(config: CommonTileManagerConfig) {
		this.config = config
		this._tileMap = new Map()
		this._promiseMap = new Map()
		this._currVisibleTiles = []
	}

	update(polaris: Polaris, projection: Projection): void {
		const tokenList = this.config.getViewTiles(polaris)
		const requestPendings: Promise<TileRenderables>[] = []
		const visibleTiles: TileRenderables[] = []

		tokenList.forEach((token) => {
			const cacheKey = this._getTileCacheKey(token)

			// check visibility if mesh already exists
			if (this._tileMap.has(cacheKey)) {
				const tile = this._tileMap.get(cacheKey)
				if (tile) {
					// manually build a promise returning the cached tile
					const promise = Promise.resolve(tile)
					requestPendings.push(promise)
					promise.then((tile) => {
						visibleTiles.push(tile)
					})
				}
				return
			}

			// skip if already in query queue
			if (this._promiseMap.has(cacheKey)) {
				return
			}

			// query new tile
			const promise = this.config.getTileRenderables(token, this)
			this._promiseMap.set(cacheKey, promise)
			requestPendings.push(promise)

			promise
				.then((tile) => {
					const { meshes, layers } = tile
					meshes.forEach((mesh) => this.config.layer.group.add(mesh))
					layers.forEach((layer) => this.config.layer.add(layer))
					visibleTiles.push(tile)
					this._tileMap.set(cacheKey, tile)
				})
				.catch((e) => {
					console.error('Polaris::TileManager - getTileRenderables error', e)
				})
		})

		// if any tiles from this frame is valid (from cache or from tile request)
		// reset last visible meshes to invisible, show current visible meshes
		// if all tile fetches were failed
		// do not hide lasst visibles and preserve what is shown
		promiseAny(requestPendings)
			.then(() => {
				this._currVisibleTiles.forEach((tile) => {
					this._setTileVisibility(tile, false)
				})
				visibleTiles.forEach((tile) => this._setTileVisibility(tile, true))
				this._currVisibleTiles = visibleTiles
			})
			.catch((e) => {
				// console.error('TileManager error', e)
			})
	}

	getCurrVisibleTiles(): TileRenderables[] {
		return Array.from(this._currVisibleTiles)
	}

	dispose(): void {
		this._tileMap.clear()
		this._promiseMap.clear()
		this._currVisibleTiles.length = 0
	}

	private _getTileCacheKey(tileToken: TileToken) {
		return tileToken.join('|')
	}

	private _setTileVisibility(tile: TileRenderables, visibility: boolean) {
		tile.meshes.forEach((mesh) => (mesh.visible = visibility))
		tile.layers.forEach((layer) => (layer.visible = visibility))
	}
}
