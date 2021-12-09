import { Timeline } from 'ani-timeline'
import { STDLayer } from '@polaris.gl/layer-std'
import { Polaris } from '@polaris.gl/schema'
import { Projection } from '@polaris.gl/projection'
import { ITileManager, TileRenderables, TileToken, CachedTileRenderables } from './types'

export type CommonTileManagerConfig = {
	/**
	 * Layer
	 */
	layer: STDLayer

	/**
	 * Method to get current view's tile tokens,
	 * normally should be sorted from middle view to edge view.
	 */
	getViewTiles: (polaris: Polaris, minZoom: number, maxZoom: number) => TileToken[]

	/**
	 * Method to get TileRenderables (meshes & sublayers) from tile token
	 */
	getTileRenderables: (token: TileToken, tileManager: CommonTileManager) => Promise<TileRenderables>

	/**
	 * Min zoom limit, default is 3
	 */
	minZoom?: number

	/**
	 * Max zoom limit, default is 20
	 */
	maxZoom?: number

	/**
	 * The max cached number of TileRenderables & tile data
	 * default is 512
	 */
	cacheSize?: number

	/**
	 * Only when the camera is stable (static) for N frames the manager will start to update tiles
	 * default is 3 frames
	 */
	stableFramesBeforeUpdate?: number

	/**
	 * Whether to print any errors to console, default is false
	 */
	printErrors?: boolean

	/**
	 * Callback which is triggered when tile will be released from this TileManager
	 */
	onTileRelease?: (tile: TileRenderables, tileToken: TileToken) => void
}

const defaultConfig = {
	minZoom: 3,
	maxZoom: 20,
	cacheSize: 512,
	stableFramesBeforeUpdate: 3,
	printErrors: false,
	onTileRelease: (tile, []) => {},
}

export class CommonTileManager implements ITileManager {
	readonly config: Required<CommonTileManagerConfig>
	private _timeline: Timeline
	private _polaris: Polaris
	private _projection: Projection
	private _updateTrack: any
	private _tileMap: Map<string, CachedTileRenderables>
	private _promiseMap: Map<string, Promise<any>>
	private _currVisibleTiles: CachedTileRenderables[]
	private _currVisibleTokens: string[]
	private _tiles: CachedTileRenderables[]
	private _lastCamState: string
	private _stableFrames: number

	constructor(config: CommonTileManagerConfig) {
		this.config = { ...defaultConfig, ...config }
		this._tileMap = new Map()
		this._promiseMap = new Map()
		this._currVisibleTiles = []
		this._currVisibleTokens = []
		this._tiles = []
		this._stableFrames = 0
	}

	/**
	 * Will not include empty TileRenderables
	 *
	 * @return {*}  {CachedTileRenderables[]}
	 * @memberof CommonTileManager
	 */
	getVisibleTiles(): CachedTileRenderables[] {
		const visTiles: CachedTileRenderables[] = []
		this._currVisibleTiles.forEach((tile) => {
			if (tile.layers.length > 0 || tile.meshes.length > 0) {
				visTiles.push(tile)
			}
		})
		return visTiles
	}

	forEachTile(f: (TileRenderables: TileRenderables, index?: number) => any) {
		this._tiles.forEach((tile, index) => {
			f(tile, index)
		})
	}

	forEachVisibleTile(f: (TileRenderables: TileRenderables, index?: number) => any) {
		this._currVisibleTiles.forEach((tile) => {
			if (tile.layers.length > 0 || tile.meshes.length > 0) {
				f(tile)
			}
		})
	}

	tileTokenToKey(tileToken: TileToken) {
		return tileToken.join('|')
	}

	keyToTileToken(key: string) {
		return key.split('|')
	}

	dispose() {
		this.stop()
		this._releaseTilesMemory(this._tiles)
		this._tileMap.clear()
		this._promiseMap.clear()
		this._currVisibleTiles.length = 0
		this._currVisibleTokens.length = 0
		this._tiles.length = 0
		this._stableFrames = 0
	}

	async start() {
		const layer = this.config.layer

		if (!this._timeline) {
			this._timeline = await layer.getTimeline()
		}
		if (!this._projection) {
			this._projection = await layer.getProjection()
		}
		if (!this._polaris) {
			this._polaris = await layer.getPolaris()
		}

		this.stop()

		this._updateTrack = this._timeline.addTrack({
			id: 'TileManager.update',
			startTime: this._timeline.currentTime,
			duration: Infinity,
			onUpdate: () => {
				this._stableFrames++
				this._updateCurrTilesVisibility()
				this._updateCache()
				if (this._stableFrames > this.config.stableFramesBeforeUpdate) {
					this._updateTiles()
				}
			},
		})

		layer.onViewChange = (cam, polaris) => {
			this._updateViewChange(polaris)
		}
	}

	async stop() {
		if (this._updateTrack) {
			this._updateTrack.alive = false
			this._updateTrack = undefined
		}
	}

	getPendingsCount() {
		return this._promiseMap.size
	}

	private _updateViewChange(polaris: any) {
		if (!this._timeline || !this._projection || !this._polaris) return

		const statesCode = polaris.getStatesCode()
		if (this._lastCamState !== statesCode) {
			this._stableFrames = 0
			this._lastCamState = statesCode
		}
	}

	private _updateTiles() {
		if (!this._timeline || !this._projection || !this._polaris) return

		const tokenList = this.config.getViewTiles(
			this._polaris,
			this.config.minZoom,
			this.config.maxZoom
		)
		const pendings: Promise<TileRenderables>[] = []
		this._currVisibleTokens.length = 0

		tokenList.forEach((token) => {
			const cacheKey = this.tileTokenToKey(token)
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
					this._addTile(cacheKey, tile)
				})
				.catch((e) => {
					if (this.config.printErrors) {
						console.error('Polaris::TileManager - getTileRenderables error', e)
					}
					this._addTile(cacheKey, undefined)
				})
		})
	}

	private _addTile(cacheKey: string, rawTile: TileRenderables | undefined) {
		if (!rawTile) {
			rawTile = { meshes: [], layers: [] }
		}

		const tile = rawTile as CachedTileRenderables

		tile.lastVisTime = this._timeline.currentTime
		tile.key = cacheKey

		this._tileMap.set(cacheKey, tile)
		this._tiles.push(tile)

		const { meshes, layers } = tile
		meshes.forEach((mesh) => this.config.layer.group.add(mesh))
		layers.forEach((layer) => this.config.layer.add(layer))

		this._setTileVisibility(tile, false)

		this._promiseMap.delete(cacheKey)
	}

	private _setTileVisibility(tile: TileRenderables, visibility: boolean) {
		tile.meshes.forEach((mesh) => (mesh.visible = visibility))
		tile.layers.forEach((layer) => (layer.visible = visibility))
	}

	private _setCurrTilesVisibility(visibility: boolean) {
		this._currVisibleTiles.forEach((tile) => {
			this._setTileVisibility(tile, visibility)
			if (visibility) {
				tile.lastVisTime = this._timeline.currentTime
			}
		})
	}

	/**
	 * check & set tiles which should be visible in current frame
	 */
	private _updateCurrTilesVisibility() {
		const tiles: CachedTileRenderables[] = []

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

	private _setEquals(a: Set<any>, b: Set<any>) {
		if (a.size !== b.size) {
			return false
		}
		for (const item of a) {
			if (!b.has(item)) return false
		}
		return true
	}

	private _releaseTilesMemory(tiles: CachedTileRenderables[]) {
		tiles.forEach((tile) => {
			const key = tile.key
			this._tileMap.delete(key)
			this._promiseMap.delete(key)
			this.config.onTileRelease(tile, this.keyToTileToken(tile.key))
			const { meshes, layers } = tile
			meshes.forEach((mesh) => this.config.layer.group.remove(mesh))
			layers.forEach((layer) => this.config.layer.remove(layer))

			// console.log('released', key)
		})
	}

	private _updateCache() {
		const cacheSize = this.config.cacheSize
		if (this._tiles.length > cacheSize) {
			const numOfReleases = this._tiles.length - cacheSize
			this._tiles.sort((a, b) => a.lastVisTime - b.lastVisTime)

			// Note: the tiles array is sorted from less vis to more vis,
			// so, if there is any tile that is currently visible,
			// it means all tiles after this one is also visible,
			// so, break the loop
			let deleteCount = 0
			for (let i = 0; i < numOfReleases; i++) {
				const tile = this._tiles[i]
				if (this._currVisibleTiles.indexOf(tile) < 0) {
					deleteCount++
				} else {
					break
				}
			}

			if (deleteCount === 0) return

			const deletedTiles = this._tiles.splice(0, deleteCount)
			deletedTiles.forEach((tile) => {
				const index = this._currVisibleTiles.indexOf(tile)
				if (index >= 0) {
					this._currVisibleTiles.splice(index, 1)
				}
			})

			this._releaseTilesMemory(deletedTiles)
		}
	}
}
