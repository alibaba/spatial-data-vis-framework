/**
 * generate /layers/index.mjs
 */
import { existsSync } from 'fs'
import { mkdir, readdir, rm, writeFile } from 'fs/promises'
import { dirname, resolve } from 'path'
import prettier from 'prettier'
import { argv } from 'process'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const __root = resolve(__dirname, '../../')
const indexFile = resolve(__root, './src/react/index.ts')

export async function genReact() {
	const layerNames = await getLayerNames()

	// wrappers
	const wrapperDir = resolve(__root, './src/react/layers')
	// 删除目录重建
	await rm(wrapperDir, { recursive: true, force: true })
	// 创建目录
	await mkdir(wrapperDir, { recursive: true })

	for (const name of layerNames) {
		await genLayerWrapper(name)
	}

	// index
	const code = /* typescript */ `
	/**
	 * !!!! DO NOT EDIT THIS !!!!
	 * @generated
	 * - This file is generated by scripts/utils/genReact.mjs on the fly, when you build or run dev server or add/rm layers.
	 * - 该文件运行时自动生成，不要修改或提交该文件
	 */

	export * from './PolarisAppComp'

	// pragma: BP_GEN LAYERS_IMPORT START
	${layerNames.map((name) => `export * from './layers/${name}Comp'`).join('\n')}
	// pragma: BP_GEN LAYERS_IMPORT END
	`

	const formattedCode = prettier.format(code, {
		...(await prettier.resolveConfig(indexFile)),
		filepath: indexFile,
	})

	// console.log(formattedCode)
	await writeFile(indexFile, formattedCode)
}

async function genLayerWrapper(layerName) {
	const wrapperFile = resolve(__root, `./src/react/layers/${layerName}Comp.tsx`)

	const code = /* typescript */ `
		/**
		 * !!!! DO NOT EDIT THIS !!!!
		 * @generated
		 * - This file is generated by scripts/utils/genReact.mjs on the fly, when you build or run dev server or add/rm layers.
		 * - 该文件运行时自动生成，不要修改或提交该文件
		 */
		import { propsDesc } from '../../layers/${layerName}'
		import { DescToType } from '../../private/utils/props'
		import { useLayer } from '../controller/ConfigAssembler'

		export function ${layerName}Comp(props: {
			name?: string
			layerProps: DescToType<typeof propsDesc> & {depthTest?: boolean, depthWrite?: boolean, renderOrder?: number}
		}) {
			useLayer(props.name || 'unnamed ${layerName}', '${layerName}', props.layerProps)

			return <></>
		}
	`

	const formattedCode = prettier.format(code, {
		...(await prettier.resolveConfig(wrapperFile)),
		filepath: wrapperFile,
	})

	// console.log(formattedCode)
	await writeFile(wrapperFile, formattedCode)
}

async function getLayerNames() {
	const layerDir = resolve(__root, './src/layers')
	console.log('genLayerIndex: layerDir', layerDir)
	const files = await readdir(layerDir)

	// filter out non-folder
	let layerNames = files.filter((f) => existsSync(resolve(layerDir, f, 'index.ts')))

	// warn if name not ended as 'Layer'
	layerNames.forEach((name) => {
		if (!name.endsWith('Layer')) {
			console.warn(
				`genLayerIndex: ${name} not ended with 'Layer'. will not be considered as a layer`
			)
		}
	})

	// filter out if not ended with 'Layer'
	layerNames = layerNames.filter((f) => f.endsWith('Layer'))

	// make sure predictable order
	layerNames.sort()

	console.group('genLayerIndex: found layers')
	layerNames.forEach((n) => console.log('-', n))
	console.groupEnd('genLayerIndex: found layers')

	return layerNames
}

const isDirectCall = import.meta.url === pathToFileURL(argv[1]).href
if (isDirectCall) {
	// module was not imported but called directly
	console.log('genLayerIndex: called directly')
	await genReact()
}