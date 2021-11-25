/* eslint-disable */

var webpack = require('webpack')
var path = require('path')
var fs = require('fs')
var ProgressBarPlugin = require('progress-bar-webpack-plugin')

process.noDeprecation = true

const entry = {
	basic: [path.resolve(__dirname, 'basic/basic.ts')],
	amd: [path.resolve(__dirname, 'amd/amd.ts')],
	basic_props: [path.resolve(__dirname, 'basic/basic_props.ts')],
	projection: [path.resolve(__dirname, 'basic/projection.ts')],
	cameraProxy: [path.resolve(__dirname, 'basic/cameraProxy.ts')],
	props_manager: [path.resolve(__dirname, 'basic/props_manager.ts')],
	layer_std: [path.resolve(__dirname, 'basic/layer_std.ts')],
	renderer: [path.resolve(__dirname, 'basic/renderer.ts')],
	multi_instances: [path.resolve(__dirname, 'basic/multi_instances.ts')],
	// basic_gl2: [path.resolve(__dirname, 'basic_gl2/index.ts')],
	polygon: [path.resolve(__dirname, 'polygon/polygon.ts')],
	scatter: [path.resolve(__dirname, 'scatter/scatter.ts')],
	flyline: [path.resolve(__dirname, 'flyline/flyline.ts')],
	marker: [path.resolve(__dirname, 'marker/marker.ts')],
	props_manager: [path.resolve(__dirname, 'basic/props_manager.ts')],
	amap: [path.resolve(__dirname, 'amap/amap.ts')],
	gltf: [path.resolve(__dirname, 'gltf/gltf.ts')],
	postprocessing: [path.resolve(__dirname, 'postprocessing/postprocessing.ts')],
	reflection: [path.resolve(__dirname, 'reflection/reflection.ts')],
	animation: [path.resolve(__dirname, 'animation/animation.ts')],
	raycast: [path.resolve(__dirname, 'raycast/raycast.ts')],
	lite_basic: [path.resolve(__dirname, 'polaris_lite/lite_basic.ts')],
	lite_raycast: [path.resolve(__dirname, 'polaris_lite/lite_raycast.ts')],
	lite_marker: [path.resolve(__dirname, 'polaris_lite/lite_marker.ts')],
	lite_polygon: [path.resolve(__dirname, 'polaris_lite/lite_polygon.ts')],
}

var config = {
	entry: entry,
	output: {
		// path: path.resolve(__dirname, 'build'),
		filename: '[name].demo.js',
		publicPath: '/static/',
	},

	// devtool: 'eval-source-map', // 性能较差但是可以保留原始ts代码，若要优化性能，注释掉这一行

	mode: 'development',
	resolve: {
		extensions: ['.js', '.scss', '.css', '.ts'],
	},
	module: {
		rules: [
			{
				// 保证 packages 里的所有依赖包都可以录入 sourcemap
				test: /\.js|ts$/,
				enforce: 'pre',
				use: ['source-map-loader'],
			},
			{
				test: /\.ts$/,
				// include: /src/,
				loader: 'ts-loader',
				options: {
					transpileOnly: true,
					configFile: path.resolve(__dirname, './tsconfig.build.json'),
				},
			},
		],
	},
}

module.exports = config
