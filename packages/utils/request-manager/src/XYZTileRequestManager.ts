import { CommonRequestManager } from './CommonRequestManager'
import { ConfigType, RequestPending } from './types'

export type XYZTileArgs = { x: number; y: number; z: number }

export interface XYZTileRequestManagerConfig extends ConfigType {
	getUrl: (requestArgs: XYZTileArgs) => string | { url: string; requestParams?: any }
	getCacheKey?: (requestArgs: XYZTileArgs) => string
	fetcher?: (requestArgs: XYZTileArgs) => RequestPending
}

export class XYZTileRequestManager extends CommonRequestManager<XYZTileArgs> {
	declare readonly config: XYZTileRequestManagerConfig

	constructor(config: XYZTileRequestManagerConfig) {
		super(config)
		if (!this.config.getUrl) {
			throw new Error('XYZTileRequestManager - config.getUrl param is essential. ')
		}
	}

	getCacheKey(requestArg: XYZTileArgs) {
		if (this.config.getCacheKey) {
			return this.config.getCacheKey(requestArg)
		}
		const { x, y, z } = requestArg
		return `${x}|${y}|${z}`
	}

	protected fetchDataDefault(requestArg: XYZTileArgs, abortSignal?: AbortSignal): Promise<any> {
		const requestInfo = this.config.getUrl(requestArg)
		const url = typeof requestInfo === 'string' ? requestInfo : requestInfo.url
		const requestParams = typeof requestInfo === 'string' ? undefined : requestInfo.requestParams

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
							resolve(res.arrayBuffer())
							break
						}
						case 'json': {
							resolve(res.json())
							break
						}
						case 'text': {
							resolve(res.text())
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
}
