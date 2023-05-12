import { Timeline } from 'ani-timeline'
import { StandardLayer } from '@polaris.gl/gsi'
import { Polaris } from '@polaris.gl/base'
import { Projection } from '@polaris.gl/projection'
import {
	TileManager,
	TileRenderables,
	TileToken,
	CachedTileRenderables,
	TilePromise,
	CachedTilePromise,
} from './types'

export type CommonTileManagerConfig = {
	/**
	 * Layer
	 */
	layer: StandardLayer

	/**
	 * Function to get current view's tile tokens,
	 * normally should be sorted from middle view to edge view.
	 */
	getViewTiles: (polaris: Polaris, minZoom: number, maxZoom: number) => TileToken[]

	/**
	 * Function to get TileRenderables (meshes & sublayers) from TileToken
	 * @param token visible tile request param, example: [x, y, z]
	 * @param tileManager the TileManager instance
	 * @return the tile renderables generation promise object: promise & abort() function
	 * @note TilePromise.promise fulfilled state -> the tile is generated successfully and will be cached by TileManager
	 * @note TilePromise.promise rejected state -> the tile generation was failed, it will not be cached and will be requested next time when it is in visible views
	 * About AbortController.abort() @link https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort
	 */
	getTileRenderables: (token: TileToken, tileManager: CommonTileManager) => TilePromise

	/**
	 * Function to get zoom -1 level TileToken from the input TileToken
	 */
	getParentTileToken: (token: TileToken) => TileToken | undefined

	/**
	 * Function to get zoom +1 level TileToken from the input TileToken
	 */
	getChildTileTokens: (token: TileToken, targetZoom: number) => TileToken[]

	/**
	 * Callback which is triggered when tile will be released from this TileManager
	 */
	onTileRelease: (tile: TileRenderables, tileToken: TileToken) => void

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
	 * default is 10 frames
	 */
	framesBeforeUpdate?: number

	/**
	 * The maximum OutOfView frames that tilePromise can have
	 * if frames reach this limit, the tilePromise will be aborted by the TileManager
	 */
	framesBeforeAbort?: number

	/**
	 * Whether to print any errors to console, default is false
	 */
	printErrors?: boolean

	/**
	 * Whether to display the nearest available parent tile when current tiles are not ready
	 */
	useParentReplaceUpdate?: boolean

	/**
	 * Whether to resend errored requests, the default is false,
	 * which means if the request failed TileManager will use an empty tile.
	 * @default false
	 */
	RetryErroredRequests?: boolean
}

const defaultConfig = {
	minZoom: 3,
	maxZoom: 20,
	cacheSize: 512,
	framesBeforeUpdate: 5,
	framesBeforeAbort: 5,
	useParentReplaceUpdate: true,
	printErrors: false,
	RetryErroredRequests: false,
}

export class CommonTileManager implements TileManager {
	readonly config: Required<CommonTileManagerConfig>
	private declare _timeline: Timeline
	private declare _polaris: Polaris
	private declare _projection: Projection
	private declare _updateTrack: any
	private declare _tileMap: Map<string, CachedTileRenderables>
	private declare _promiseMap: Map<string, CachedTilePromise>
	private declare _currVisibleTiles: CachedTileRenderables[]
	private declare _currVisibleKeys: string[]
	private declare _tiles: CachedTileRenderables[]
	private declare _lastStatesCode: string
	private declare _stableFrames: number
	private declare _currZoomLevel: number

	constructor(config: CommonTileManagerConfig) {
		this.config = { ...defaultConfig, ...config }
		this._tileMap = new Map()
		this._promiseMap = new Map()
		this._currVisibleTiles = []
		this._currVisibleKeys = []
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
		return Array.from(this._currVisibleTiles)

		// const visTiles: CachedTileRenderables[] = []
		// this._currVisibleTiles.forEach((tile) => {
		// 	if (tile.layers.length > 0 || tile.meshes.length > 0) {
		// 		visTiles.push(tile)
		// 	}
		// })
		// return visTiles
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
		return key.split('|').map((v) => (isNaN(parseFloat(v)) ? v : parseFloat(v)))
	}

	dispose() {
		this.stop()
		this._releaseTilesMemory(this._tiles)
		this._tileMap.clear()
		this._promiseMap.clear()
		this._currVisibleTiles.length = 0
		this._currVisibleKeys.length = 0
		this._tiles.length = 0
		this._stableFrames = 0
	}

	async start() {
		const layer = this.config.layer
		if (!layer.inited) {
			console.warn('can not start tileManager before layer inited')
		}

		if (!this._timeline) {
			this._timeline = layer['timeline']
		}
		if (!this._projection) {
			this._projection = layer['projection']
		}
		if (!this._polaris) {
			this._polaris = layer['polaris']
		}

		this.stop()

		this._updateTrack = this._timeline.addTrack({
			id: 'TileManager.update',
			startTime: this._timeline.currentTime,
			duration: Infinity,
			onUpdate: () => {
				this._stableFrames++

				if (this._stableFrames > this.config.framesBeforeUpdate) {
					this._updateTiles()
				}

				this._abortOutOfViewPromises()

				if (this.config.useParentReplaceUpdate) {
					this._updateCurrTilesVisReplaceVer()
				} else {
					this._updateCurrTilesVisibility()
				}

				this._updateCache()
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

	getPendsCount() {
		return this._promiseMap.size
	}

	private _updateViewChange(polaris: any) {
		if (!this._timeline || !this._projection || !this._polaris) return

		const statesCode = polaris.getStatesCode()
		if (this._lastStatesCode !== statesCode) {
			this._stableFrames = 0
			this._lastStatesCode = statesCode
		}
	}

	private _updateTiles() {
		if (!this._timeline || !this._projection || !this._polaris) return

		this._currZoomLevel = this._polaris.cameraProxy.zoom

		const tokenList = this.config.getViewTiles(
			this._polaris,
			this.config.minZoom,
			this.config.maxZoom
		)
		this._currVisibleKeys.length = 0

		tokenList.forEach((token) => {
			const cacheKey = this.tileTokenToKey(token)
			this._currVisibleKeys.push(cacheKey)

			// check visibility if mesh already exists
			if (this._tileMap.has(cacheKey)) {
				return
			}

			// skip if already in query queue
			if (this._promiseMap.has(cacheKey)) {
				return
			}

			// query new tile
			const tilePromise = this.config.getTileRenderables(token, this)
			if (!tilePromise || !tilePromise.promise) {
				if (this.config.printErrors) {
					console.error('Polaris::TileManager - getTileRenderables() result is invalid. ')
				}
				return
			}

			// cache
			const cachedPromise: CachedTilePromise = {
				...tilePromise,
				key: cacheKey,
				outOfViewFrames: 0,
			}
			this._promiseMap.set(cacheKey, cachedPromise)

			// handle renderables
			const promise = cachedPromise.promise
			promise
				.then((tile) => {
					this._addTile(cacheKey, tile)
				})
				.catch((err) => {
					if (this._tileMap.has(cacheKey)) {
						return
					}

					if (!this._promiseMap.has(cacheKey)) {
						// promise was either aborted by us or never requested (which is abnormal)
						// @NOTE: We do not identify the 'AbortError string from this error obj,
						// as in many apps the errors are intercepted in the way of rejection.
						// So, we should never assume the error.name/.message to be some specific string.
						// We should only identify it from the user's abort() function return value.
						// When abort() returns { success: true }, the promiseCache will be removed from map
						return
					}

					if (this.config.printErrors) {
						console.error('Polaris::TileManager - getTileRenderables error', err)
					}

					if (this.config.RetryErroredRequests) {
						// delete errored requests, retry next time
						this._promiseMap.delete(cacheKey)
					} else {
						// add empty tile renderables if server response is errorlike
						this._addTile(cacheKey, undefined)
					}
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
		const visTiles: CachedTileRenderables[] = []

		this._currVisibleKeys.forEach((tileKey) => {
			const tile = this._tileMap.get(tileKey)
			if (tile) {
				visTiles.push(tile)
			}
		})

		if (visTiles.length === 0 || this._arrayEquals(visTiles, this._currVisibleTiles)) {
			return
		}

		this._setCurrTilesVisibility(false)
		this._currVisibleTiles.length = 0
		this._currVisibleTiles.push(...visTiles)
		this._setCurrTilesVisibility(true)
	}

	/**
	 * Update tiles: ver.2 - replacement method
	 *
	 * steps:
	 * 1. check state & list unready tiles
	 * 2. get nearest available parents for unready tiles
	 * 3. show parent tiles instead of unready tiles, but hide those children covered by them
	 *
	 */
	private _updateCurrTilesVisReplaceVer() {
		const availableKeys: Set<string> = new Set()
		const unreadyKeys: Set<string> = new Set()

		// filter: available / unready tiles
		this._currVisibleKeys.forEach((tileKey) => {
			if (this._tileMap.has(tileKey)) {
				availableKeys.add(tileKey)
			} else {
				unreadyKeys.add(tileKey)
			}
		})

		// if there is any tiles already generated, it can be displayed
		// replace the low level tiles with generated high level tile immediately
		// will let user know map is loading
		if (availableKeys.size > 0) {
			this._updateCurrTilesVisibility()
			return
		}

		// unready to parent tiles replacement
		const childKeysCoveredByParent: Set<string> = new Set()
		unreadyKeys.forEach((key) => {
			const parentTileInfo = this._findReadyParentTile(this.keyToTileToken(key))
			if (!parentTileInfo) return

			const { parentToken, includedChildTokens } = parentTileInfo

			// add available parent tile to vis list
			availableKeys.add(this.tileTokenToKey(parentToken))

			// list covered children (from vis list)
			const childrenKeys = includedChildTokens.map((tile) => this.tileTokenToKey(tile))
			availableKeys.forEach((key) => {
				if (childrenKeys.includes(key)) {
					childKeysCoveredByParent.add(key)
				}
			})
		})

		// remove tiles covered by available parent
		childKeysCoveredByParent.forEach((key) => {
			availableKeys.delete(key)
		})

		const visTiles: CachedTileRenderables[] = []
		availableKeys.forEach((key) => {
			const tile = this._tileMap.get(key)
			if (tile) {
				visTiles.push(tile)
			}
		})

		if (visTiles.length === 0 || this._arrayEquals(visTiles, this._currVisibleTiles)) {
			return
		}

		this._setCurrTilesVisibility(false)
		this._currVisibleTiles.length = 0
		this._currVisibleTiles.push(...visTiles)
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
		// DEBUG
		// console.log(
		// 	'release',
		// 	tiles.map((tile) => tile.key)
		// )

		tiles.forEach((tile) => {
			const key = tile.key
			this._tileMap.delete(key)
			const { meshes, layers } = tile
			meshes.forEach((mesh) => this.config.layer.group.remove(mesh))
			layers.forEach((layer) => this.config.layer.remove(layer))
			this.config.onTileRelease(tile, this.keyToTileToken(tile.key))
		})
	}

	private _updateCache() {
		const cacheSize = this.config.cacheSize
		if (this._tiles.length <= cacheSize) return

		const numOfReleases = this._tiles.length - cacheSize
		this._tiles.sort((a, b) => a.lastVisTime - b.lastVisTime)

		// Note:
		// the tiles array is sorted from less to more wrt vis count, if there is any tile that is currently visible,
		// it means all tiles after this one is also visible. So break the loop is reasonable here.
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

	private _abortOutOfViewPromises() {
		const outOfViewCaches: CachedTilePromise[] = []

		this._promiseMap.forEach((tilePromise, key) => {
			if (this._tileMap.has(key)) {
				return
			}
			if (!this._currVisibleKeys.includes(key)) {
				tilePromise.outOfViewFrames++
				outOfViewCaches.push(tilePromise)
			} else {
				tilePromise.outOfViewFrames = 0
			}
		})

		outOfViewCaches.forEach((cache) => {
			if (cache.outOfViewFrames > this.config.framesBeforeAbort) {
				// abort the promise
				if (cache.abort) {
					const { success } = cache.abort()
					// the abort operation may be failed
					if (success) {
						this._promiseMap.delete(cache.key)
					}
				}
			}
		})
	}

	private _findReadyParentTile(token: TileToken):
		| {
				parentToken: TileToken
				includedChildTokens: TileToken[]
		  }
		| undefined {
		// traverse the entire tile tree till root
		// get the nearest available parent tile token
		let parentToken = this.config.getParentTileToken(token)

		while (parentToken) {
			const parentKey = this.tileTokenToKey(parentToken)
			if (this._tileMap.has(parentKey)) {
				break
			} else {
				// keep traverse parent, until 'undefined' reaches
				parentToken = this.config.getParentTileToken(parentToken)
			}
		}

		if (!parentToken) return

		const includedChildTokens = this.config.getChildTileTokens(parentToken, this._currZoomLevel)

		return {
			parentToken,
			includedChildTokens,
		}
	}
}
