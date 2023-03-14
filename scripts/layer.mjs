import { existsSync } from 'fs'
import { copyFile, mkdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, resolve } from 'path'
import prettier from 'prettier'
import { argv as rawArgv } from 'process'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const __dirname = dirname(fileURLToPath(import.meta.url))

const argv = yargs(hideBin(rawArgv)).argv
console.log(__dirname, argv)

const action = argv.action
const layerName = argv.layerName
let flavor = argv.flavor

if (action !== 'add' && action !== 'delete') throw new Error('需要指定 add 还是 delete 操作')

if (layerName[0] !== layerName[0].toUpperCase())
	throw new Error('Layer Name 应使用大驼峰(class 命名)')

// 检查只包含字母和数字
if (!/^[a-zA-Z0-9]+$/.test(layerName)) throw new Error('Layer Name 只能包含字母和数字')

if (!flavor) {
	console.log('未指定 flavor, 默认为 factory (工厂函数风格，可选 class, factory)')
	flavor = 'factory'
} else {
	if (flavor !== 'class' && flavor !== 'factory')
		throw new Error('flavor 只能选择 class 或 factory')
}

console.log('action:', action, ', layerName:', layerName, ', flavor:', flavor)

// gen class code

const layersRoot = resolve(__dirname, '../src/layers')
const layerFolder = resolve(layersRoot, layerName)
const layerIndexFile = resolve(layerFolder, 'index.ts')
const templateFile = resolve(
	__dirname,
	flavor === 'class'
		? '../src/private/templates/layer/index.class.ts'
		: '../src/private/templates/layer/index.factory.ts'
)

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

const indexFile = resolve(__dirname, '../src/layers/index.ts')
const indexCode = await readFile(indexFile, 'utf-8')

let lines = indexCode.split('\n')
lines = lines.map((line) => line.trim())

// import
{
	const START = lines.findIndex((l) => l.includes('pragma: BP_GEN LAYERS_IMPORT START'))
	const END = lines.findIndex((l) => l.includes('pragma: BP_GEN LAYERS_IMPORT END'))

	let LAYERS_IMPORT = lines.slice(START + 1, END)

	if (action === 'add') {
		LAYERS_IMPORT.push(
			`import { create${layerName}, propsDesc as propsDesc${layerName} } from './${layerName}'`
		)
	} else {
		LAYERS_IMPORT = LAYERS_IMPORT.filter((l) => !l.includes(`'./${layerName}'`))
	}

	lines.splice(START + 1, END - START - 1, LAYERS_IMPORT)
}

// export
{
	const START = lines.findIndex((l) => l.includes('pragma: BP_GEN LAYERS_EXPORT START'))
	const END = lines.findIndex((l) => l.includes('pragma: BP_GEN LAYERS_EXPORT END'))

	const LAYERS_EXPORT = lines.slice(START + 1, END)

	const sections = []
	let currName = null
	let currLines = null
	LAYERS_EXPORT.forEach((l) => {
		const testStart = /\/\/\spragma:\s(.*)\sSTART/g.exec(l)
		if (testStart) {
			const name = testStart[1]
			// console.log('found start', name)

			currName = name
			currLines = []

			currLines.push(l)

			return
		}

		const testEnd = /\/\/\spragma:\s(.*)\sEND/g.exec(l)
		if (testEnd) {
			const name = testEnd[1]
			if (name !== currName) {
				throw new Error('名字匹配错误')
			}
			// console.log('found end', name)

			currLines.push(l)

			if (action === 'add' || layerName !== currName) sections.push(currLines)

			currName = null
			currLines = null

			return
		}

		if (currName) {
			// console.log(currName, '->', l)
			currLines.push(l)
		}
	})

	// console.log(sections)

	if (action === 'add') {
		sections.push([
			`// pragma: ${layerName} START`,
			`${layerName}: {`,
			`factory: create${layerName},`,
			`propsDescription: propsDesc${layerName},`,
			'},',
			`// pragma: ${layerName} END`,
		])
	}

	// console.log(sections)

	// console.log(LAYERS_EXPORT)

	lines.splice(START + 1, END - START - 1, sections)
}

let newCode = lines.flat(2).join('\n')

newCode = prettier.format(newCode, {
	...(await prettier.resolveConfig(indexFile)),
	filepath: indexFile,
})

// console.log(newCode)

await writeFile(indexFile, newCode)
