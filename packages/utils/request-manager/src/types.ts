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
	 * The default data fetch method can be overwritten
	 */
	fetcher?: (url: string, requestParams?: any) => Promise<any>
}

export interface IRequestManager {
	readonly config: ConfigType
	request(url: string, requestParams?: any): Promise<any>
	getCachedData(url: string, requestParams?: any): any
	dispose(): void
}
