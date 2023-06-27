/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { BasicProps, defaultBasicProps } from './BasicProps'
import { CameraProps, defaultCameraProps } from './CameraProps'
import { SceneProps, defaultSceneProps } from './SceneProps'

export interface PolarisProps extends BasicProps, CameraProps, SceneProps {}

export const defaultProps = {
	...defaultBasicProps,
	...defaultCameraProps,
	...defaultSceneProps,
}

export const STATIC_PROPS = [
	'autoResize' as const,
	'renderToFBO' as const,
	'frustumCulling' as const,
	'deepPicking' as const,
	'asyncRendering' as const,
	'container' as const,
	'timeline' as const,
	'projection' as const,
	'cameraControl' as const,
]
