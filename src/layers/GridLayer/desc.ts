/**
 * Props Description. Used to generate the props editor UI.
 */
export const propsDesc = [
	{
		key: 'width',
		type: 'number',
		defaultValue: 100000,
		mutable: true,
		range: {
			min: 1,
			max: 10000000,
		},
		name: 'Width',
		info: 'Width of the grid field',
	},
	{
		key: 'height',
		type: 'number',
		defaultValue: 100000,
		mutable: true,
		range: {
			min: 1,
			max: 10000000,
		},
		name: 'Height',
		info: 'Height of the grid field',
	},
	{
		key: 'widthSegments',
		type: 'number',
		defaultValue: 100,
		mutable: true,
		range: {
			min: 1,
			max: 1000,
		},
		name: 'Horizontal Segment Number',
	},
	{
		key: 'heightSegments',
		type: 'number',
		defaultValue: 100,
		mutable: true,
		range: {
			min: 1,
			max: 1000,
		},
		name: 'Vertical Segment Number',
	},
	{
		key: 'lineWidth',
		type: 'number',
		defaultValue: 10,
		mutable: true,
		range: {
			min: 1,
			max: 1000,
		},
		name: 'Line Width',
	},
	{
		key: 'fixOverlap',
		type: 'boolean',
		defaultValue: true,
		mutable: false,
		name: 'Whether to fix overlapping fragments',
		info: 'This will add overhead but opacity will be correct',
	},
	{
		key: 'color',
		type: 'color',
		defaultValue: 'red',
		mutable: true,
		name: 'Color',
	},
	{
		key: 'opacity',
		type: 'number',
		defaultValue: 1,
		mutable: true,
		range: {
			min: 0,
			max: 1,
		},
		name: 'Opacity',
	},
	{
		key: 'centerLLA',
		type: 'string',
		defaultValue: '[0, 0, 0]',
		mutable: true,
		name: 'Center lng/lat/alt',
	},
	{
		key: 'showCircles',
		type: 'boolean',
		defaultValue: false,
		mutable: true,
	},
	{
		key: 'circleRadius',
		type: 'number',
		defaultValue: 10,
		mutable: true,
		range: {
			min: 1,
			max: 1000,
		},
	},
	{
		key: 'circleSegments',
		type: 'number',
		defaultValue: 20,
		mutable: true,
	},
	{
		key: 'circleColor',
		type: 'color',
		defaultValue: 'green',
		mutable: true,
	},
	{
		key: 'circleOpacity',
		type: 'number',
		defaultValue: 1,
		mutable: true,
		range: {
			min: 0,
			max: 1,
		},
	},
] as const
