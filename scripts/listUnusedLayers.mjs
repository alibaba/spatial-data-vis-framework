/* eslint-env node */
import { readdirSync, statSync } from 'fs'
import { readFile } from 'fs/promises'
import * as path from 'path'
import { dirname } from 'path'
import { argv } from 'process'
import { fileURLToPath, pathToFileURL } from 'url'

import { getLayerNames } from './utils/genLayerIndex.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function listUnusedLayers() {
	const usedLayers = []

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

			entries.push(`src/config/${filename}`)
		}
		return entries
	}

	const entries = getConfigEntries()

	for (let i = 0; i < entries.length; i++) {
		const presetName = entries[i]
		const text = await readFile(path.resolve(presetName))
		const preset = JSON.parse(text)
		preset.layers.forEach((layer) => {
			if (!usedLayers.includes(layer.class)) {
				usedLayers.push(layer.class)
			}
		})
	}

	const allLayers = await getLayerNames()

	const unusedLayers = allLayers.filter((layer) => !usedLayers.includes(layer))

	return unusedLayers
}

const isDirectCall = import.meta.url === pathToFileURL(argv[1]).href
if (isDirectCall) {
	// module was not imported but called directly
	console.log('listUnusedLayers: called directly')
	const unusedLayers = await listUnusedLayers()
	console.log(unusedLayers)
}
