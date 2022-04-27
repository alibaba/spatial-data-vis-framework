/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs')
const path = require('path')

const rootPath = __dirname
const ext = '.js'
const srcPath = path.resolve(rootPath, '../src')
const distPath = path.resolve(rootPath, '../dist')

// create dist folder if necessary
if (!fs.existsSync(distPath)) {
	fs.mkdirSync(distPath)
}

const glob = require('glob')

glob(srcPath + '/**/*.glsl', {}, (err, files) => {
	if (files.length === 0) {
		console.log(`[glsl-processor] - No glsl files found.`)
	}

	files.forEach((filePathAbs) => {
		const filePathRel = path.relative(srcPath, filePathAbs)

		const targetPath = path.resolve(distPath, filePathRel)

		const targetDirPath = path.dirname(targetPath)

		if (!fs.existsSync(targetDirPath)) {
			console.log('dist folder does not exist: ' + targetDirPath + '. -> mkdir-ing...')
			fs.mkdirSync(targetDirPath, { recursive: true })
		}

		fs.readFile(filePathAbs, 'utf-8', (err, data) => {
			if (err) {
				console.error(err)
				return
			}

			data = data.replace(/\/\/[^\n]*/g, '') // Remove comments
			data = data.trim()
			data = data.replace(/\n{1,}/g, '\n') // Remove empty lines

			const transContent = 'export default /* glsl */`' + data + '`'

			fs.writeFile(targetPath + ext, transContent, (err) => {
				if (err) {
					console.error(err)
					return
				}
				console.log('\x1b[32m%s\x1b[0m', `[glsl-processor] - ${filePathRel}`)
			})
		})
	})
})
