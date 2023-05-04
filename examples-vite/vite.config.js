/*eslint-env node*/
const path = require('path')
const fs = require('fs')
const { defineConfig } = require('vite')

const entries = getDemoEntries()

module.exports = defineConfig(
	/** @type {import('vite').UserConfig} */
	{
		define: {
			entries,
		},
		server: {
			open: true,
			host: '0.0.0.0',
			port: 2000,
			cors: true,
			force: true,
			hmr: {
				clientPort: process.env['CODESPACE_NAME'] ? 443 : undefined,
			},
			watch: {
				// without this, vite will watch all files in node_modules
				ignored: ['!**/node_modules/@polaris.gl/**'],
			},
		},
	}
)

function getDemoEntries() {
	return getAllPageDirs(path.resolve(__dirname, './')).map((dir) => {
		return path.relative(__dirname, dir)
	})
}

function getAllPageDirs(root) {
	const dirs = []
	const pageDir = fs.readdirSync(root) || []

	for (let j = 0; j < pageDir.length; j++) {
		const filePath = path.resolve(root, pageDir[j])
		const fileStat = fs.statSync(filePath)
		const filename = path.basename(filePath)

		if (
			fileStat.isSymbolicLink() ||
			filename === 'node_modules' ||
			filename === 'typings' ||
			filename === 'proxy' ||
			filename.startsWith('__') ||
			filename.startsWith('.') ||
			filename.startsWith('_')
		) {
			continue
		}

		if (fileStat.isDirectory()) {
			const files = fs.readdirSync(filePath)
			if (files.includes('index.html')) {
				dirs.push(filePath)
			} else {
				for (let i = 0; i < files.length; i++) {
					dirs.push(...getAllPageDirs(filePath, files[i]))
				}
			}
		}
	}
	return dirs
}
