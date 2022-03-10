/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Timeline } from 'ani-timeline'
import { Projection } from '@polaris.gl/projection'

export const defaultBasicProps = {
	/**
	 * specific width @pixel
	 */
	width: 500,
	/**
	 * specific height @pixel
	 */
	height: 500,
	/**
	 * Resize polaris elements & canvas responsively
	 */
	autoResize: true,

	/**
	 * pixel ratio, this affect the actual rendering resolution.
	 *
	 * @note use 2 for HDPI,
	 * @default 1
	 */
	ratio: 1,

	/**
	 * render to frame buffer object
	 */
	renderToFBO: false,

	/**
	 * enable frustumCulling feature
	 */
	frustumCulling: true,

	/**
	 * enable pointer(mouser/touch) events
	 */
	enablePointer: true,

	/**
	 * whether to enable penetrating picking
	 * default is false
	 */
	deepPicking: false,

	/**
	 * enable async rendering (use setTimeout internally)
	 * specifically for syncing with AMap render process
	 */
	asyncRendering: false,

	/**
	 * enable debug mode or not
	 */
	debug: false,

	/**
	 * whether to start play automatically after construction
	 * @note DO NOT ENABLE THIS IF YOU REUSE THE TIMELINE
	 */
	autoplay: true,
}

export type BasicProps = Partial<typeof defaultBasicProps> & {
	/**
	 * container DOM for mounting everything
	 */
	container: HTMLDivElement

	/**
	 * timeline
	 */
	timeline?: Timeline

	/**
	 * projection
	 */
	projection?: Projection
}
