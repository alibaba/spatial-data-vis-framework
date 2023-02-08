import type { PropDescription } from '../../private/schema/meta'

/**
 * Props Description. Used to generate the props editor UI.
 */
export const propsDesc = [
	{
		key: 'pivot' as const,
		type: 'vec2' as const,
		defaultValue: { x: 0.5, y: 0.5 },
		mutable: true, // 可修改，无需重建layer
		range: { min: { x: -10, y: -10 }, max: { x: 10, y: 10 } },
		name: '锚点',
		info: '变换的相对中心',
	},
	{
		key: 'flickerSpeed' as const,
		type: 'number' as const,
		defaultValue: 1,
		mutable: true,
		range: { min: 0, max: 10 },
		name: '闪烁速度',
		info: '闪烁速度',
	},
	{
		key: 'density' as const,
		type: 'number' as const,
		defaultValue: 1,
		mutable: true,
		range: { min: 0, max: 1 },
		name: '闪烁密度',
		info: '闪烁密度，0: 全部隐藏（不显示），1: 全部显示（不闪烁）， 0.5: 一半显示',
	},
	{
		key: 'size' as const,
		type: 'vec2' as const,
		defaultValue: { x: 10, y: 10 },
		mutable: true,
		range: { min: { x: -1, y: -1 }, max: { x: Infinity, y: Infinity } },
		name: '尺寸',
		info: '尺寸，单位米',
	},
	{
		key: 'texture' as const,
		type: 'texture' as const,
		defaultValue: 'https://img.alicdn.com/tfs/TB1tvfvMlr0gK0jSZFnXXbRRXXa-512-512.png',
		mutable: true,
		name: '纹理',
		info: '纹理',
	},

	// data

	{
		key: 'data' as const,
		type: 'any' as const,
		isDataProp: true,
		defaultValue: null,
		mutable: true,
		name: '点位数据',
	},
] as PropDescription[]

// type Props = DescToType<typeof propsDesc>
