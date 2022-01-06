/**
 * DO NOT EDIT
 * AUTO COPIED FROM ROOT/shared
 */

/**
 * fix es module file extensions
 *
 * es module requires file extension in `import`, but tsc ignored it.
 *
 * `import` without extension still work with webpack in curtain circumstances.
 * @link /docs/index.md
 * should not depend on it.
 */

/**
 * @NOTE 这种方案会破坏掉 sourcemap ，但是考虑到 sourcemap 的原理，如果修改的内容都在行尾，应该没有问题
 * @BTW 生成的js完全是可读的，sourcemap完全可以去掉来节约编译时间
 */

/**
 * String.prototype.replaceAll() polyfill
 * https://gomakethings.com/how-to-replace-a-section-of-a-string-with-another-one-with-vanilla-js/
 * @author Chris Ferdinandi
 * @license MIT
 */
if (!String.prototype.replaceAll) {
	String.prototype.replaceAll = function (str, newStr) {
		// If a regex pattern
		if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
			return this.replace(str, newStr)
		}

		// If a string
		return this.replace(new RegExp(str, 'g'), newStr)
	}
}

import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

import { accessSync, constants } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

// https://regex101.com/r/UK27wD/1
const reImport = /(import(?:["'\s\w*{}/\n\r\t, ]+from\s*)?\s*["']\s*)([./@\w_-]+)(["'\s].*)$/gm
// https://regex101.com/r/5iG1QQ/1
const reExport = /(export(?:["'\s\w*{}/\n\r\t, ]+from\s*)?["']\s*)([./@\w_-]+)(["'\s].*)$/gm

async function editFile(file) {
	const text = (await readFile(file)).toString()

	// 需要 file 在闭包里
	function replacement(match, before, moduleName, after) {
		if (
			(moduleName.startsWith('.') || moduleName.startsWith('/')) &&
			!(
				moduleName.endsWith('.js') ||
				moduleName.endsWith('.mjs') ||
				moduleName.endsWith('.node') ||
				moduleName.endsWith('.wasm') ||
				moduleName.endsWith('.bin')
			)
		) {
			// console.log('find:', match)
			// 本地引用需要添加后缀名
			// 检查被引用的模块是否存在

			const jsTarget = path.resolve(path.dirname(file), moduleName + '.js')
			const mjsTarget = path.resolve(path.dirname(file), moduleName + '.mjs')

			let extension

			try {
				accessSync(jsTarget, constants.R_OK)
				extension = '.js'
			} catch (error) {
				// js target 不存在
				// 尝试 mjs
				try {
					accessSync(mjsTarget, constants.R_OK)
					extension = '.mjs'
				} catch (error) {
					console.warn(
						'\x1b[33m%s\x1b[0m',
						`找不到被引用的模块，将使用 .js 作为后缀：${moduleName} in ${file}`
					)
					extension = '.js'
				}
			}

			const newModuleName = moduleName + extension

			const replacement = before + newModuleName + after
			// console.log('---->', replacement)
			return replacement
		} else {
			return match
		}
	}

	const newText = text.replace(reImport, replacement)
	const newText2 = newText.replace(reExport, replacement)
	await writeFile(file, newText2)
}

import glob from 'glob'

glob(path.resolve(__dirname, '../dist') + '/**/*.js', {}, (err, files) => {
	// console.log(files)
	files.forEach(async (file) => {
		await editFile(path.resolve(__dirname, '../', file))
	})
})
