/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

// worker-loader.d.ts
declare module 'worker-loader!*' {
	class WebpackWorker extends Worker {
		constructor()
	}
	export default WebpackWorker
}
