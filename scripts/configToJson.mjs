import { readdirSync, statSync } from 'fs'
import { copyFile, writeFile } from 'fs/promises'
import * as path from 'path'
import { dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// conv js module to json

{
	const getConfigEntries = () => {
		const dirPath = path.resolve(__dirname, '../', './intermediate/jsm/config')
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

			const stem = path.basename(filePath, extension)

			entries.push({
				input: `intermediate/jsm/config/${filename}`,
				output: `intermediate/bundled/${stem}.json`,
			})
		}
		return entries
	}

	const entries = getConfigEntries()
	entries.forEach(async ({ input, output }) => {
		console.log(`config ==> ${input} -> ${output}`)

		// console.log(path.resolve(input))
		// NOTE
		const module = await import(pathToFileURL(path.resolve(input)))
		// console.log(module.default)
		const json = JSON.stringify(module.default)
		// console.log(json)
		await writeFile(path.resolve(output), json)
	})
}

// move json

{
	const getConfigEntries = () => {
		const dirPath = path.resolve(__dirname, '../', './src/config')
		const entries = []
		const files = readdirSync(dirPath) || []

		for (let j = 0; j < files.length; j++) {
			const filePath = path.resolve(dirPath, files[j])
			const fileStat = statSync(filePath)
			const filename = path.basename(filePath)
			const extension = path.extname(filePath)

			if (fileStat.isDirectory() || extension !== '.json') {
				continue
			}

			const stem = path.basename(filePath, extension)

			entries.push({
				input: `src/config/${filename}`,
				output: `intermediate/bundled/${stem}.json`,
			})
		}
		return entries
	}

	const entries = getConfigEntries()
	entries.forEach(async ({ input, output }) => {
		console.log(`config ==> ${input} -> ${output}`)
		await copyFile(path.resolve(input), path.resolve(output))
	})
}
