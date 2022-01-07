declare module 'worker-loader!*' {
	class WebpackWorker extends Worker {
		constructor()
	}

	export = WebpackWorker
}
declare module '*.worker' {
	class WebpackWorker extends Worker {
		constructor()
	}

	export = WebpackWorker
}
