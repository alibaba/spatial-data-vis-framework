export {}

declare global {
	interface ImportMeta {
		readonly hot?: ViteHotContext
	}

	type ModuleNamespace = Record<string, any> & {
		[Symbol.toStringTag]: 'Module'
	}

	interface ViteHotContext {
		readonly data: any

		accept(): void
		accept(cb: (mod: ModuleNamespace | undefined) => void): void
		accept(dep: string, cb: (mod: ModuleNamespace | undefined) => void): void
		accept(deps: readonly string[], cb: (mods: Array<ModuleNamespace | undefined>) => void): void

		dispose(cb: (data: any) => void): void
		prune(cb: (data: any) => void): void
		invalidate(message?: string): void

		// `InferCustomEventPayload` provides types for built-in Vite events
		on<T extends string>(event: T, cb: (payload: any) => void): void
		send<T extends string>(event: T, data?: any): void
	}
}
