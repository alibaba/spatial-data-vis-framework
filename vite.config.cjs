/*eslint-env node*/
const path = require('path')
const fs = require('fs')
const { defineConfig } = require('vite')
// import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
const basicSsl = require('@vitejs/plugin-basic-ssl')

const entries = getDemoEntries()

console.log(entries)

module.exports = defineConfig({
	define: {
		IS_WEBPACK: false,
		entries,
	},
	publicDir: 'assets',
	server: {
		open: '/examples/index.html',
		host: '0.0.0.0',
		port: 2000,
		cors: true,
		https: true,
	},
	worker: {
		format: 'es',
	},
	esbuild: {
		target: 'esnext',
	},
	plugins: [basicSsl()],
	clearScreen: false,
	optimizeDeps: {
		force: true,
		esbuildOptions: {
			// splitting: false,
			// external: 'workers/*',
			// bundle: true,
			target: 'esnext',
		},
	},
	// optimizeDeps: false,
})

function getDemoEntries() {
	const dirPath = path.resolve(__dirname, './examples')
	const entries = []
	const pageDir = fs.readdirSync(dirPath) || []

	for (let j = 0; j < pageDir.length; j++) {
		const filePath = path.resolve(dirPath, pageDir[j])
		const fileStat = fs.statSync(filePath)
		const filename = path.basename(filePath)

		if (
			filename === 'node_modules' ||
			filename === 'typings' ||
			filename === 'proxy' ||
			filename.startsWith('__')
		) {
			continue
		}

		if (fileStat.isDirectory()) {
			entries.push(pageDir[j])
		}
	}
	return entries
}
