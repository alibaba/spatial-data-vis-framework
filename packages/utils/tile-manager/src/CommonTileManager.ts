import { Timeline } from 'ani-timeline'
import { STDLayer } from '@polaris.gl/layer-std'
import { Polaris } from '@polaris.gl/schema'
import { Projection } from '@polaris.gl/projection'
import { ITileManager, TileRenderables, TileToken } from './types'

export type CommonTileManagerConfig = {
	/**
	 * layer
	 */
	layer: STDLayer

	/**
	 * min zoom limit, default is 3
	 */
	minZoom: number

	/**
	 * max zoom limit, default is 20
	 */
	maxZoom: number

	/**
	 * 从当前View中获取tileToken list的方法
	 */
	getViewTiles: (polaris: Polaris, minZoom: number, maxZoom: number) => TileToken[]

	/**
	 * 通过tileTokens获取tile可渲染元素的方法
	 */
	getTileRenderables: (token: TileToken, tileManager: CommonTileManager) => Promise<TileRenderables>

	/**
	 * whether to print any errors to console, default is false
	 */
	printErrors?: boolean
}

const defaultConfig = {
	minZoom: 3,
	maxZoom: 20,
	printErrors: false,
}

export class CommonTileManager implements ITileManager {
	readonly config: CommonTileManagerConfig
	private _timeline: Timeline
	private _track: any
	private _tileMap: Map<string, TileRenderables>
	private _promiseMap: Map<string, Promise<any>>
	private _currVisibleTiles: TileRenderables[]
	private _currVisibleTokens: string[]

	constructor(config: Omit<CommonTileManagerConfig, 'minZoom' | 'maxZoom'>) {
		this.config = { ...defaultConfig, ...config }
		this._tileMap = new Map()
		this._promiseMap = new Map()
		this._currVisibleTiles = []
		this._currVisibleTokens = []
		this._initUpdateTrack()
	}

	update(polaris: Polaris, projection: Projection): void {
		const tokenList = this.config.getViewTiles(polaris, this.config.minZoom, this.config.maxZoom)
		const pendings: Promise<TileRenderables>[] = []
		this._currVisibleTokens.length = 0

		tokenList.forEach((token) => {
			const cacheKey = this.getTileCacheKey(token)
			this._currVisibleTokens.push(cacheKey)

			// check visibility if mesh already exists
			if (this._tileMap.has(cacheKey)) {
				return
			}

			// skip if already in query queue
			if (this._promiseMap.has(cacheKey)) {
				return
			}

			// query new tile
			const promise = this.config.getTileRenderables(token, this)
			if (!promise) {
				if (this.config.printErrors) {
					console.error('Polaris::TileManager - getTileRenderables() result is invalid. ')
				}
				return
			}

			this._promiseMap.set(cacheKey, promise)
			pendings.push(promise)

			promise
				.then((tile) => {
					this._tileMap.set(cacheKey, tile)
					const { meshes, layers } = tile
					meshes.forEach((mesh) => this.config.layer.group.add(mesh))
					layers.forEach((layer) => this.config.layer.add(layer))
					this._setTileVisibility(tile, false)
				})
				.catch((e) => {
					if (this.config.printErrors) {
						console.error('Polaris::TileManager - getTileRenderables error', e)
					}
				})
		})
	}

	getCurrVisibleTiles(): TileRenderables[] {
		return Array.from(this._currVisibleTiles)
	}

	getTileCacheKey(tileToken: TileToken) {
		return tileToken.join('|')
	}

	dispose(): void {
		this._tileMap.clear()
		this._promiseMap.clear()
		this._currVisibleTiles.length = 0
	}

	private async _initUpdateTrack() {
		if (this._track) {
			this._track.alive = false
		}
		if (!this._timeline) {
			this._timeline = await this.config.layer.getTimeline()
		}
		this._track = this._timeline.addTrack({
			startTime: this._timeline.currentTime,
			duration: Infinity,
			onUpdate: () => {
				this._updateCurrTilesVisibility()
			},
		})
	}

	private _setTileVisibility(tile: TileRenderables, visibility: boolean) {
		tile.meshes.forEach((mesh) => (mesh.visible = visibility))
		tile.layers.forEach((layer) => (layer.visible = visibility))
	}

	private _setCurrTilesVisibility(visibility: boolean) {
		this._currVisibleTiles.forEach((tile) => {
			this._setTileVisibility(tile, visibility)
		})
	}

	/**
	 * check & set tiles which should be invisible in current frame
	 */
	private _updateCurrTilesVisibility() {
		const tiles: TileRenderables[] = []

		this._currVisibleTokens.forEach((token) => {
			const tile = this._tileMap.get(token)
			if (tile) {
				tiles.push(tile)
			}
		})

		if (tiles.length === 0 || this._arrayEquals(tiles, this._currVisibleTiles)) {
			return
		}

		this._setCurrTilesVisibility(false)
		this._currVisibleTiles.length = 0
		this._currVisibleTiles.push(...tiles)
		this._setCurrTilesVisibility(true)
	}

	private _arrayEquals(a: any[], b: any[]) {
		return a.length === b.length && a.every((val, index) => val === b[index])
	}
}
