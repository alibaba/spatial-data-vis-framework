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

type OptionalDefault<TFull extends Record<string, any>, TDefault extends TFull> = Omit<
	TFull,
	keyof TDefault
> &
	Partial<TDefault>
