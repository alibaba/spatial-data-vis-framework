import type { PropDescription } from '../../private/schema/meta'

/**
 * Props Description. Used to generate the props editer UI.
 */
export const propsDesc = [
	{
		key: 'pivot' as const,
		type: 'vec2' as const,
		defaultValue: [0.5, 0.5],
		mutable: true, // 可修改，无需重建layer
		range: {
			min: [0, 0],
			max: [1, 1],
		},
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
		defaultValue: [10, 10],
		mutable: true,
		range: { min: [0, Infinity], max: [0, Infinity] },
		name: '尺寸',
		info: '尺寸，单位米',
	},
	{
		key: 'texture' as const,
		type: 'texture' as const,
		defaultValue: '',
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
