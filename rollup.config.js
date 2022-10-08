import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
	input: 'intermediate/jsm/App.js',
	output: {
		file: 'intermediate/bundled/App.mjs',
		format: 'esm',
	},
	plugins: [nodeResolve(), commonjs()],
}
