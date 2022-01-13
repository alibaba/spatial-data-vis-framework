/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Timeline } from 'ani-timeline'
import { Projection } from '@polaris.gl/projection'

export interface BasicProps {
	/**
	 * container DOM for mounting everything
	 */
	container?: HTMLDivElement

	/**
	 * specific width, use css style width if not given
	 */
	width: number

	/**
	 * specific height, use css style height if not given
	 */
	height: number

	/**
	 * Resize polaris elements & canvas responsively
	 */
	autoResize?: boolean

	/**
	 * pixel ratio, 2 for hdpi, defualt 1
	 */
	ratio?: number

	/**
	 * timeline
	 */
	timeline?: Timeline

	/**
	 * projection
	 */
	projection?: Projection

	// /**
	//  * Renderer props
	//  */
	// renderer?: RendererProps
	renderToFBO?: boolean

	/**
	 * enable pointer(mouser/touch) events
	 */
	enablePointer?: boolean

	/**
	 * whether to enable penetrating picking
	 * default is false
	 */
	deepPicking?: boolean

	/**
	 * enable frustumCulling feature
	 */
	frustumCulling?: boolean

	/**
	 * enable async rendering (use setTimeout internally)
	 * specifically for syncing with AMap render process
	 */
	asyncRendering?: boolean

	/**
	 * enable debug mode or not
	 */
	debug?: boolean
}

export const defaultBasicProps: BasicProps = {
	width: 500,
	height: 500,
	autoResize: true,
	renderToFBO: false,
	frustumCulling: true,
	enablePointer: true,
	deepPicking: false,
	asyncRendering: false,
	debug: false,
}
