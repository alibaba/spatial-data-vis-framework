/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

var webpack = require('webpack')
var path = require('path')

process.noDeprecation = true

var config = {
	entry: {
		index: ['./src/index.ts'],
	},
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js',
		libraryTarget: 'umd',
		globalObject: 'this',
	},
	mode: 'production',
	devtool: 'source-map',
	stats: 'normal',
	plugins: [
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify('production'),
			},
		}),
		new webpack.NoEmitOnErrorsPlugin(), // 出错时不发布
	],
	resolve: {
		alias: {
			src: path.join(__dirname, 'src'),
		},
		extensions: ['.js', '.scss', '.css', '.ts'],
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				include: /src|demo/,
				use: 'ts-loader',
			},
		],
	},
}

module.exports = config
