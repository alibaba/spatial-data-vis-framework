/**
 * Event structure
 * @deprecated
 */
export type MapType<T extends Record<string, any>> = {
	[K in keyof T]: {
		/**
		 * Event Type
		 */
		type: K
		/**
		 * Event Data
		 */
		data: T[K]
		/**
		 * Event Source (dispatched by)
		 */
		source?: any
	}
}
