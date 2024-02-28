import { argv } from 'process'
import { pathToFileURL } from 'url'

let mod = null
let meta = null

try {
	globalThis['window'] = globalThis
	globalThis['document'] = {
		createElement: () => ({
			style: {},
			getContext: () => ({ getExtension: () => undefined }),
		}),
	}
	mod = await import('../../intermediate/bundled/App.mjs')
	// console.log(mod)
} catch (error) {
	console.log('layers 导入失败')
	console.error(error)
}

if (mod) {
	const { App } = mod
	meta = App.$getMeta()
	// console.log(meta)
}

/**
 * 读取 Layer 的 Props Description
 */
export async function getPropsDesc(layer) {
	if (!meta) {
		console.log('读取不到 Layer 数据，请先运行 npm run build')
		return
	}

	const layerMeta = meta.layers[layer]
	if (!layerMeta) {
		console.log('Layer 不存在')
		return
	}

	const propsDescription = layerMeta.propsDescription

	return propsDescription
}

const isDirectCall = import.meta.url === pathToFileURL(argv[1]).href
if (isDirectCall) {
	// module was not imported but called directly
	console.log('called directly, test only')
	const desc = await getPropsDesc('BillboardsLayer')
	console.log(desc)
}
