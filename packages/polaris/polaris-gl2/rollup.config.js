/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/* eslint-disable no-useless-escape */
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

function glsl() {
	return {
		transform(code, id) {
			if (/\.glsl.js$/.test(id) === false) return

			code = code.replace(/\/\* glsl \*\/\`((.|\n)*)\`/, function (match, p1) {
				return JSON.stringify(
					p1
						.trim()
						.replace(/\r/g, '')
						.replace(/[ \t]*\/\/.*\n/g, '') // remove //
						.replace(/[ \t]*\/\*[\s\S]*?\*\//g, '') // remove /* */
						.replace(/\n{2,}/g, '\n') // # \n+ to \n
				)
			})

			return {
				code: code,
				map: null,
			}
		},
	}
}

export default [
	{
		input: 'dist/Polaris.gl2.js',
		plugins: [nodeResolve(), commonjs({ include: /node_modules/ }), glsl()],
		output: [
			{
				format: 'esm',
				file: 'dist/Polaris.gl2.module.js',
				indent: '\t',
			},
		],
		external: ['gl2'],
	},
]
