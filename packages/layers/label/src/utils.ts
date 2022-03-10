export type RequireDefault<TFull extends Record<string, any>, TDefault extends TFull> = {
	[K in keyof TFull]: K extends keyof TDefault ? Exclude<TFull[K], undefined> : TFull[K]
}

export type OptionalDefault<TFull extends Record<string, any>, TDefault extends TFull> = Omit<
	TFull,
	keyof TDefault
> &
	Partial<TDefault>

export function functionlize<T extends string | number | boolean | null | undefined>(
	v: T | ((...args: any[]) => T)
) {
	if (typeof v === 'function') {
		return v
	} else {
		return (...args: any[]) => v
	}
}
