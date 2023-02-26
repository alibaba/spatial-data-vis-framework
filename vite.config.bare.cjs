/*eslint-env node*/

const yargs = require('yargs')
const { hideBin } = require('yargs/helpers')
const colors = require('colors/safe.js')

const argv = yargs(hideBin(process.argv)).argv

const { defineConfig } = require('vite')
// import { viteCommonjs } from '@originjs/vite-plugin-commonjs'

// @note 如果使用 https，在 [Backend Integration](https://vitejs.dev/guide/backend-integration.html) 时会无法连接 ws
// const basicSsl = require('@vitejs/plugin-basic-ssl')

if (!argv.host) console.log(colors.bgYellow('No host specified, using localhost'))
if (!argv.port) console.log(colors.bgYellow('No port specified, using 2000'))

const host = argv.host || 'localhost'
const port = argv.port || 2000

const origin = `http://${host}:${port}`

module.exports = defineConfig({
	define: {
		IS_WEBPACK: false,
	},
	publicDir: 'assets',
	server: {
		host,
		port,
		origin,
		cors: true,
		// https: true,
		strictPort: true,
	},
	worker: {
		format: 'es',
	},
	esbuild: {
		target: 'esnext',
	},
	plugins: [
		// basicSsl(),
		absolutifyPaths({
			strings: [
				['url(/src', `url(${origin}/src/`],
				["url('/src/", `url('${origin}/src/`],
				['src="/src/', `src="${origin}/src/`],
				["'/src/", `'${origin}/src/`],
				['"/src/', `'${origin}/src/`],
				["'/assets/", `'${origin}/assets/`],
			],
		}),
	],
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
})

/**
 * rollup plugin to make paths absolute
 * @see {@link https://github.com/vitejs/vite/issues/2394}
 */
function absolutifyPaths(options = {}) {
	const { strings = [], enforce = 'pre', apply = 'serve' } = options
	return {
		name: 'absolutify-paths',
		enforce: enforce,
		apply: apply,
		transform: (code, id) => {
			let transformedCode = code
			strings.forEach((str) => {
				if (code.includes(str[0])) {
					transformedCode = transformedCode.split(str[0]).join(str[1])
				}
			})
			return {
				code: transformedCode,
				map: null,
			}
		},
	}
}

function handleKill() {
	console.warn(`Vite-backend service killed by parent.`)
	process.exit()
}

// catches ctrl+c event
process.on('SIGINT', () => {
	console.warn(`Vite-backend service stopped by user.`)
	process.exit()
})
// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', handleKill)
process.on('SIGUSR2', handleKill)
process.on('SIGTERM', handleKill)
//catches uncaught exceptions
process.on('uncaughtException', () => {
	console.error(`Vite-backend service stopped by uncaught exception.`)
	process.exit()
})
