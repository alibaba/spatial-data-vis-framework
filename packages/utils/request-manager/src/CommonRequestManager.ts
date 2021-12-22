import { RequestManager, ConfigType, RequestPending } from './types'

export class CommonRequestManager<T = { url: string; requestParams?: any }>
	implements RequestManager<T>
{
	readonly config: ConfigType

	protected _requestCacheMap: Map<string, RequestPending> = new Map()

	protected _dataCacheMap: Map<string, any> = new Map()

	constructor(config: ConfigType) {
		if (!config.dataType) {
			throw new Error(`CommonRequestManager - Invalid config param: dataType`)
		}
		this.config = config
	}

	request(requestArg: T): RequestPending {
		const cacheKey = this.getCacheKey(requestArg)
		if (typeof cacheKey !== 'string') {
			throw new Error('CommonRequestManager - CacheKey must be string')
		}

		const cachedData = this._dataCacheMap.get(cacheKey)
		if (cachedData !== undefined) {
			return { promise: Promise.resolve(cachedData) }
		}

		const cachedPromise = this._requestCacheMap.get(cacheKey)
		if (cachedPromise) {
			return cachedPromise
		}

		if (this.config.fetcher) {
			const fetcherPending = this.config.fetcher(requestArg)
			if (!fetcherPending.promise) {
				throw new Error(
					`CommonRequestManager - Invalid custom fetcher return type: should be: { promise, abort? }`
				)
			}
			return fetcherPending
		}

		// abort signal prep
		const abortController = AbortController ? new AbortController() : undefined
		const signal = abortController ? abortController.signal : undefined

		const promise = new Promise<any>((resolve, reject) => {
			this.fetchDataDefault(requestArg, signal)
				.then((result) => {
					this._dataCacheMap.set(cacheKey, result)
					this._requestCacheMap.delete(cacheKey)
					resolve(result)
				})
				.catch((e) => {
					this._dataCacheMap.delete(cacheKey)
					this._requestCacheMap.delete(cacheKey)
					reject(e)
				})
		})

		const abort = () => {
			if (abortController) {
				abortController.abort()
				return { success: true }
			}
			return { success: false }
		}

		const requestPending = {
			promise,
			abort,
		}

		this._requestCacheMap.set(cacheKey, requestPending)

		return requestPending
	}

	getCacheKey(requestArg: T) {
		let cacheKey = ''
		for (const key in requestArg) {
			if (Object.prototype.hasOwnProperty.call(requestArg, key)) {
				const value = requestArg[key]
				if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
					cacheKey += value.toString() + '|'
				} else if (typeof value === 'function') {
					continue
				} else if (typeof value === 'object') {
					cacheKey += JSON.stringify(value) + '|'
				} else {
					cacheKey += `${value}` + '|'
				}
			}
		}
		return cacheKey
	}

	dispose() {
		this._requestCacheMap.clear()
		this._dataCacheMap.clear()
	}

	protected fetchDataDefault(requestArg: T, abortSignal?: AbortSignal): Promise<any> {
		const args = requestArg as any
		const url = typeof requestArg === 'string' ? args : args.url
		const requestParams =
			typeof requestArg === 'string' ? undefined : args.requestParams || args.params

		if (!url) {
			console.error('CommonRequestManager - Invalid request url param. ')
			return Promise.reject()
		}

		return new Promise((resolve, reject) => {
			fetch(url, {
				...requestParams,
				signal: abortSignal,
			})
				.then((res) => {
					if (!res.ok) {
						reject(res)
						return
					}
					switch (this.config.dataType) {
						case 'auto': {
							const data = this.getDataFromResponse(res)
							if (data) {
								resolve(data)
							} else {
								reject(new Error('Unknown Response Content-Type'))
							}
							break
						}
						case 'arraybuffer': {
							res.arrayBuffer().then(resolve).catch(reject)
							break
						}
						case 'json': {
							res.json().then(resolve).catch(reject)
							break
						}
						case 'text': {
							res.text().then(resolve).catch(reject)
							break
						}
						default: {
							resolve(res)
						}
					}
				})
				.catch(reject)
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

	protected getDataFromResponse(res: Response) {
		const contentType = res.headers.get('Content-Type')
		if (!contentType) {
			console.error(
				'CommonRequestManager - No Content-Type was found in response headers, use .json() by default'
			)
			return res.json()
		}
		const type = contentType.split(';')[0]
		switch (type) {
			case 'application/json': {
				return res.json()
			}
			case 'application/octet-stream': {
				return res.arrayBuffer()
			}
			case 'application/x-protobuf': {
				return res.arrayBuffer()
			}
			case 'text/plain': {
				return res.text()
			}
			default: {
				console.error(`CommonRequestManager - Unknown Response Content-Type: ${contentType}`)
				return
			}
		}
	}
}
