/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
// import typescript from '@rollup/plugin-typescript'

export default [
	{
		input: './dist/index.js',
		plugins: [
			nodeResolve(),
			commonjs({ include: /node_modules/, extensions: ['.js', '.ts'] }),
			// typescript({
			// 	// rootDir: './src',
			// 	tsconfig: './tsconfig.json',
			// }),
		],
		output: {
			format: 'esm',
			// dir: 'dist',
			file: './dist/index.module.js',
			indent: '\t',
			// sourcemap: true,
		},

		external: ['@polaris.gl/projection'],
	},
]
