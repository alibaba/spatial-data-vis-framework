import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import sourcemaps from 'rollup-plugin-sourcemaps'

export default {
	output: {
		format: 'cjs',
		sourcemap: true,
	},
	plugins: [commonjs(), nodeResolve(), sourcemaps()],
}
