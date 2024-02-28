import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import strip from '@rollup/plugin-strip'
import dts from 'rollup-plugin-dts'

function getAppEntries() {
	const entries = []

	// react index
	entries.push({
		input: `intermediate/jsm/react/index.js`,
		output: {
			file: `intermediate/bundled-react/index.mjs`,
			format: 'esm',
			sourcemap: true,
		},
		plugins: [
			nodeResolve(),
			commonjs(),
			strip({ labels: ['ViteHot', '$asset'] }),
			replace({
				'preventAssignment': true,
				'process.env.NODE_ENV': JSON.stringify('production'),
			}),
		],
		external: ['react', 'react-dom'],
	})

	// react ts declaration
	entries.push({
		input: `intermediate/jsm/react/index.d.ts`,
		output: [{ file: `intermediate/bundled-react/index.d.ts`, format: 'es' }],
		plugins: [dts()],
		external: ['react', 'react-dom'],
	})

	return entries
}

const config = getAppEntries()
if (config.length === 0) {
	throw new Error('Could not find any app entry.')
}
config.map((e) => console.log(`==> \t ${e.input}`))

export default config
