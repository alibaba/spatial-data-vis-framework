/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { BasicProps, defaultBasicProps } from './BasicProps'
import { CameraProps, defaultCameraProps } from './CameraProps'
import { SceneProps, defaultSceneProps, colorToString } from './SceneProps'

export interface PolarisProps extends BasicProps, CameraProps, SceneProps {}

export const defaultProps: PolarisProps = {
	...defaultBasicProps,
	...defaultCameraProps,
	...defaultSceneProps,
}

export { colorToString }
