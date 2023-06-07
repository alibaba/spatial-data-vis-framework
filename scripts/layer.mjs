import { existsSync } from 'fs'
import { copyFile, mkdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, resolve } from 'path'
import prettier from 'prettier'
import { argv as rawArgv } from 'process'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { genLayerIndex } from './utils/genLayerIndex.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const argv = yargs(hideBin(rawArgv)).argv
// console.log(__dirname, argv)

const action = argv.action
const layerName = argv.layerName
let flavor = argv.flavor

if (action !== 'add' && action !== 'delete') throw new Error('需要指定 add 还是 delete 操作')
if (!layerName) throw new Error('需要指定 layerName')

if (layerName[0] !== layerName[0].toUpperCase())
	throw new Error('Layer Name 应使用大驼峰(class 命名)')

if (!layerName.endsWith('Layer')) throw new Error('Layer Name 应以 Layer 结尾')

// 检查只包含字母和数字
if (!/^[a-zA-Z0-9]+$/.test(layerName)) throw new Error('Layer Name 只能包含字母和数字')

const TEMPL = {
	class: '../src/private/templates/layer/index.class.ts',
	factory: '../src/private/templates/layer/index.factory.ts',
	gsi: '../src/private/templates/layer/index.gsi.ts',
	three: '../src/private/templates/layer/index.three.ts',
	marker: '../src/private/templates/layer/index.marker.ts',
}

const FLAVORS = Object.keys(TEMPL)

if (!flavor) {
	console.log(`未指定 flavor, 默认为 factory (工厂函数风格，可选 ${FLAVORS})`)
	flavor = 'factory'
} else {
	if (!FLAVORS.includes(flavor)) throw new Error(`flavor 只能选择 ${FLAVORS}`)
}

console.log('action:', action, ', layerName:', layerName, ', flavor:', flavor)

// gen class code

const layersRoot = resolve(__dirname, '../src/layers')
const layerFolder = resolve(layersRoot, layerName)
const layerIndexFile = resolve(layerFolder, 'index.ts')
const templateFile = resolve(__dirname, TEMPL[flavor])

if (action === 'add') {
	if (existsSync(layerFolder)) throw new Error('Layer Name already exists.')

	await mkdir(layerFolder)

	await copyFile(templateFile, layerIndexFile)

	let codeText = await readFile(layerIndexFile, 'utf-8')

	// 替换名字
	codeText = codeText.replace(/\$LAYER_NAME\$/g, layerName)

	// 删除 REMOVE 中间的多行代码
	codeText = codeText.replace(/\/\/ \$REMOVE_START\$[\s\S]*\/\/ \$REMOVE_END\$/g, '')

	const prettierConfig = await prettier.resolveConfig(layerIndexFile)

	codeText = prettier.format(codeText, { ...prettierConfig, filepath: layerIndexFile })

	await writeFile(layerIndexFile, codeText)
} else {
	if (!existsSync(layerFolder)) throw new Error('Layer Name does not exists.')

	await rm(layerFolder, { recursive: true, force: true })
}

// update Layer List

await genLayerIndex()
