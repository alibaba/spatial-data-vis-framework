import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import sourcemaps from 'rollup-plugin-sourcemaps'
import webWorkerLoader from 'rollup-plugin-web-worker-loader'
// import OMT from '@surma/rollup-plugin-off-main-thread'

export default {
	output: {
		format: 'esm',
		sourcemap: true,
		inlineDynamicImports: true,
	},
	plugins: [commonjs(), nodeResolve(), sourcemaps(), webWorkerLoader()],
}
