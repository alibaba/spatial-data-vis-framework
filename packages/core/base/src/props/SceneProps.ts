/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * 场景配置接口
 * 不同渲染器支持的场景配置是完全不同的，抽出这个文件是希望能保留交集，实现语意一致
 * 这个文件中的接口应该被所有版本的渲染器实现
 */

import { SceneProps } from '@gs.i/schema-ext-scene'

export const defaultSceneProps: SceneProps = {
	background: '#333',
	lights: {},
	antialias: 'msaa',
}

export type { SceneProps }
