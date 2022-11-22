import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { readdirSync, statSync } from 'fs'
import * as path from 'path'
import { dirname } from 'path'
import dts from 'rollup-plugin-dts'
import sourcemaps from 'rollup-plugin-sourcemaps'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function getAppEntries() {
	const dirPath = path.resolve(__dirname, './intermediate/jsm/apps')
	const entries = []
	const files = readdirSync(dirPath) || []

	for (let j = 0; j < files.length; j++) {
		const filePath = path.resolve(dirPath, files[j])
		const fileStat = statSync(filePath)
		const filename = path.basename(filePath)
		const extension = path.extname(filePath)

		if (fileStat.isDirectory() || (extension !== '.js' && extension !== '.mjs')) {
			continue
		}

		// if (fileStat.isDirectory()) {
		// entries.push(files[j])
		// }

		const stem = path.basename(filePath, extension)

		entries.push(
			// js and sourcemap
			{
				input: `intermediate/jsm/apps/${filename}`,
				output: {
					file: `intermediate/bundled/${stem}.mjs`,
					format: 'esm',
					sourcemap: true,
				},
				plugins: [nodeResolve(), commonjs(), sourcemaps()],
			},
			// ts declaration
			{
				input: `intermediate/jsm/apps/${stem}.d.ts`,
				output: [{ file: `intermediate/bundled/${stem}.d.ts`, format: 'es' }],
				plugins: [dts()],
			}
		)
	}

	// AppBase type declaration

	entries.push({
		input: `intermediate/jsm/private/base/AppBase.d.ts`,
		output: [{ file: `intermediate/bundled/AppBase.d.ts`, format: 'es' }],
		plugins: [dts()],
	})

	return entries
}

const config = getAppEntries()
if (config.length === 0) {
	throw new Error('Could not find any app entry.')
}
config.map((e) => console.log(`==> \t ${e.input}`))

export default config
