/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */

var path = require('path')
const common = require('../webpack.common')

process.noDeprecation = true

const entry = {
	'std-helper': [path.resolve(__dirname, 'src/umd.ts')],
}

var config = {
	...common,

	entry: entry,

	devtool: 'source-map', // 性能较差但是可以保留原始ts代码，若要优化性能，注释掉这一行
	// devtool: false,

	mode: 'production',
	// mode: 'development',
	resolve: {
		extensions: ['.js', '.scss', '.css', '.ts'],
	},
	module: {
		rules: [
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
