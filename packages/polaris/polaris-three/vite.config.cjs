/*eslint-env node*/
const { defineConfig } = require('vite')

const vitePluginString = require('vite-plugin-string').default

module.exports = defineConfig({
	server: {
		open: true,
		host: '0.0.0.0',
		port: 2000,
		cors: true,
		force: true,
		watch: {
			// without this, vite will watch all files in node_modules
			ignored: ['!**/node_modules/@polaris.gl/**'],
		},
	},
	plugins: [
		vitePluginString({
			/* Default */
			include: ['**/*.glsl'],

			/* Default: undefined */
			exclude: 'node_modules/**',

			/* Default: true */
			// if true, using logic from rollup-plugin-glsl
			compress: false,
		}),
	],
})
