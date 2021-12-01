export type ConfigType = {
	/**
	 * The return data type
	 */
	dataType: 'auto' | 'json' | 'arraybuffer' | 'text'

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