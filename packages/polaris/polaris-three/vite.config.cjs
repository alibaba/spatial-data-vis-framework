/*eslint-env node*/
const path = require('path')
const fs = require('fs')
const { defineConfig } = require('vite')

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
})
