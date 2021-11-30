import { IRequestManager, ConfigType } from './types'

export class CommonRequestManager implements IRequestManager {
	readonly config: ConfigType

	private _requestCacheMap: Map<string, Promise<any>> = new Map()

	private _dataCacheMap: Map<string, any> = new Map()

	constructor(config: ConfigType) {
		if (!config.dataType) {
			throw new Error(`CommonRequestManager - Invalid config param: dataType`)
		}
		this.config = config
	}

	/**
	 * Can be overwritten in other cases
	 * @param url
	 * @param requestParams
	 * @returns
	 */
	fetchData(url: string, requestParams?: any): Promise<any> {
		if (this.config.fetcher) {
			return Promise.resolve(this.config.fetcher(url, requestParams))
		}

		return new Promise((resolve, reject) => {
			fetch(url, requestParams).then((res) => {
				if (!res.ok) {
					reject(res)
				}
				if (this.config.dataType === 'arraybuffer') resolve(res.arrayBuffer())
				if (this.config.dataType === 'json') resolve(res.json())
			})
		})

		// requestParams = requestParams || {}
		// return new Promise((resolve, reject) => {
		// 	const xhr = new XMLHttpRequest()
		// 	xhr.responseType = this.config.dataType
		// 	const listener = (e) => {
		// 		const status = xhr.status
		// 		if (status === 200) {
		// 			resolve(xhr.response)
		// 		} else if (status === 400) {
		// 			reject(new Error('Request failed because the status is 404'))
		// 		} else {
		// 			reject(new Error('Request failed because the status is not 200'))
		// 		}
		// 	}
		// 	xhr.addEventListener('loadend', listener)
		// 	xhr.addEventListener('error', (e) => {
		// 		reject(new Error('Request failed'))
		// 	})
		// 	xhr.open(requestParams.method || 'GET', url)
		// 	xhr.send()
		// })
	}

	request(url: string, requestParams?: any): Promise<any> {
		const cacheKey = this._getCacheKey(url, requestParams)

		const cachedData = this._dataCacheMap.get(cacheKey)
		if (cachedData !== undefined) {
			return Promise.resolve(cachedData)
		}

		const cachedPromise = this._requestCacheMap.get(cacheKey)
		if (cachedPromise) {
			return cachedPromise
		}

		const promise = new Promise<any>((resolve, reject) => {
			this.fetchData(url, requestParams)
				.then((result) => {
					this._requestCacheMap.delete(cacheKey)
					this._dataCacheMap.set(cacheKey, result)
					resolve(result)
				})
				.catch((e) => {
					reject(e)
				})
		})

		this._requestCacheMap.set(cacheKey, promise)

		return promise
	}

	getCachedData(url: string, requestParams?: any) {
		return this._dataCacheMap.get(this._getCacheKey(url, requestParams))
	}

	dispose() {
		this._requestCacheMap.clear()
		this._dataCacheMap.clear()
	}

	private _getCacheKey(url: string, requestParams?: any) {
		return `${url}|${JSON.stringify(requestParams)}`
	}
}
