/**
 * About AbortController.abort()
 * @link https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort
 */
export type RequestPending = {
	promise: Promise<any>
	abort?: () => { success: boolean }
}

export type ConfigType = {
	/**
	 * The return data type
	 * @type 'auto' indicates RequestManager to automatically parse the response according to headers.Content-Type
	 */
	dataType: 'auto' | 'json' | 'arraybuffer' | 'text'

	/**
	 * Cache size limit for requests
	 * default is 1024
	 */
	cacheSize?: number

	/**
	 * The data fetch method which can be customized by user
	 */
	fetcher?: (...args) => RequestPending
}

export interface IRequestManager<RequestArgsType> {
	readonly config: ConfigType
	request(args: RequestArgsType): RequestPending
	getCacheKey(args: RequestArgsType): string
	dispose(): void
}
