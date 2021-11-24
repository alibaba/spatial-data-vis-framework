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

export function colorToString(RGB): string {
	if (Array.isArray(RGB)) {
		// if (RGB.length === 3) {
		return 'rgb(' + RGB.join(',') + ')'
		// } else {
		// 	console.warn('RGB应该为3位，alpha通道可能不会支持')
		// 	return 'rgba(' + RGB.join(',') + ')'
		// }
	} else {
		// undefined | string
		return RGB
	}
}

export const defaultSceneProps: SceneProps = {
	background: '#333',
	lights: {
		ambientLight: { intensity: 1.0 },
	},
	antialias: 'msaa',
}

export { SceneProps }
