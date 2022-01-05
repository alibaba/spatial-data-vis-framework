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

const files = fs.readdirSync(srcPath)
let count = 0
files.forEach((file) => {
	if (file.endsWith('.glsl')) {
		fs.readFile(path.resolve(srcPath, file), 'utf-8', (err, data) => {
			if (err) {
				console.error(err)
				return
			}

			data = data.replace(/\/\/[^\n]*/g, '') // Remove comments
			data = data.trim()
			data = data.replace(/\n{1,}/g, '\n') // Remove empty lines

			const transContent = 'export default `' + data + '`'

			fs.writeFile(path.resolve(distPath, file + ext), transContent, (err) => {
				if (err) {
					console.error(err)
					return
				}
				console.log(
					'\x1b[32m%s\x1b[0m',
					`[glsl-processor] - File ${file} has been translated to ./dist/${file + ext}`
				)
			})
		})
		count++
	}
})
if (count === 0) {
	console.log(`[glsl-processor] - No glsl files found, skip`)
}
