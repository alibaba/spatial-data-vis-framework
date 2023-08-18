const ENABLE_PERSISTENT_STORAGE = false
const CACHE_NAME = 'p_asset_v1'

if (ENABLE_PERSISTENT_STORAGE) {
	if (navigator.storage && navigator.storage.persist) {
		navigator.storage.persist().then((persistent) => {
			if (persistent) {
				console.log('Storage persisted.')
			} else {
				console.warn('Storage not persisted, may be cleared by the UA under storage pressure.')
			}
		})
	}
}

const cachePromise = window.caches?.open(CACHE_NAME) ?? Promise.resolve(null)

;(async () => {
	if (!(await cachePromise)) console.warn('CacheStorage is not supported.')
})()

// 计算 assetBaseUrl

/**
 * 是否为 vite 本地开发环境
 */
let isViteDev: boolean | undefined

/**
 * asset 资源的实际地址
 */
let assetBaseUrl: string | undefined

try {
	const moduleURL = import.meta.url
	isViteDev = !!import.meta.env?.DEV

	assetBaseUrl = moduleURL
} catch (error) {
	console.log('PolarisAppKit: 无法获取 import.meta.url, 尝试使用全局变量 __ASSET_BASE_URL__')
	if (typeof __ASSET_BASE_URL__ === 'string') {
		assetBaseUrl = __ASSET_BASE_URL__
	} else {
		console.log('PolarisAppKit: 无法获取全局变量 __ASSET_BASE_URL__, $asset:// 协议将无法使用')
	}
}

/**
 * 下载并缓存远程资源
 *
 * @support
 * - 支持 http/https 协议的绝对地址
 * - 支持 $asset:// 协议的相对地址
 * - 支持 $pack:// 协议的单文件地址
 *
 * @forbidden
 * - 不支持 http/https 相对地址和 file data blob 等协议
 *
 * @note
 * - 使用相对路径时，直接 throw
 * - 使用 http/https:// 协议时，fetch 并缓存
 * - 使用 $asset:// 协议时
 * 		- 如果是 vite 本地开发环境，则从 {项目根目录}/assets/ 读取
 * 		- 如果是打包后发布的远程地址，则从 {import.meta.url}/assets/ 读取
 * 		- 如果无法判断环境（被用户的webpack二次打包，或者用非 ESM 的形式引入）
 * 			- 读取全局变量 __ASSET_BASE_URL__，并从 {__ASSET_BASE_URL__}/ 读取
 * 			- 如果没有全局变量，直接 throw
 * - 使用 $pack:// 协议时
 * 		- 从预先下载好的 pack 文件中读取
 *
 * @note
 * - 资源会被按 URL 缓存，并忽略 http header
 * - 除非包含 ?no-cache=true //localhost //127.0.0.1
 *
 * @TODO: 应该允许用户强制指定 __ASSET_BASE_URL__，以免用户的 CDN 不支持这样的目录结构
 */
export async function fetchAsset(assetPath: string) {
	// 兼容旧版本的 $assets:// 协议
	assetPath = legacyFix(assetPath)

	// 检查协议是否支持
	checkProtocol(assetPath)

	/**
	 * 解析实际地址
	 */
	let readPath: string

	if (assetPath.startsWith('$asset://')) {
		// $asset:// 协议 相对地址
		if (!assetBaseUrl)
			throw new Error(
				'PolarisAppKit: 无法解析 $asset:// 协议地址，如果使用了自定义的打包工具，请添加全局变量 __ASSET_BASE_URL__'
			)

		if (isViteDev) {
			// moduleURL 形如 http://localhost:4001/src/layers/ALayer/index.ts?t=1679323503824
			// assets  地址为 http://localhost:4001/assets/
			readPath = new URL(assetPath.replace('$asset://', '/assets/'), assetBaseUrl).href
		} else {
			// moduleURL 形如 http://cdn.com/project/0.0.1/app.mjs
			// assets  地址为 http://cdn.com/project/0.0.1/assets/
			readPath = new URL(assetPath.replace('$asset://', './assets/'), assetBaseUrl).href
		}
	} else {
		// http/https 协议 绝对地址
		readPath = assetPath
	}

	// console.log('PolarisAppKit: fetchAsset', assetPath, readPath)

	// 下载资源并缓存

	const cache = await cachePromise

	const url = new URL(readPath)

	if (
		!cache ||
		url.searchParams.get('no-cache') === 'true' ||
		url.hostname === 'localhost' ||
		url.hostname === '127.0.0.1'
	) {
		// console.log('PolarisAppKit: 不适用缓存', readPath)
		return fetch(readPath)
	}

	// 检查缓存，如果未缓存，则添加到缓存里，然后返回
	const cachedResponse = await cache.match(readPath)

	if (cachedResponse) {
		// console.log('命中缓存', readPath)
		return cachedResponse
	} else {
		// console.log('未命中缓存', readPath)
		// @note: cache.add 不支持 3xx 重定向，而且不能立刻返回 response
		const response = await fetch(readPath)

		if (response.ok) {
			// 先返回后缓存

			try {
				cache.put(readPath, response.clone())
			} catch (error) {
				console.error('PolarisAppKit: 缓存失败', error)
			}
		}

		maintainCache()

		return response
	}
}

/**
 * check if the uri is a fetch-able asset uri
 */
export function isAssetUri(uri: string) {
	if (
		uri.startsWith('http://') ||
		uri.startsWith('https://') ||
		uri.startsWith('//') ||
		uri.startsWith('$asset://') ||
		uri.startsWith('$pack://') ||
		uri.startsWith('$assets') // legacy
	)
		return true

	return false
}

/**
 * 检查协议是否被支持
 */
function checkProtocol(url: string) {
	if (
		url.startsWith('http://') ||
		url.startsWith('https://') ||
		url.startsWith('//') ||
		url.startsWith('$asset://')
	)
		return

	const legacyAssetReg = /^\$assets(\(.*\))?:\/\//
	if (legacyAssetReg.test(url)) throw new Error('$assets(*):// 协议不再支持，请改为 $asset:// 协议')

	if (url.startsWith('$pack://')) throw new Error('$pack:// 协议暂未实现')

	throw new Error('不支持的协议(' + url.slice(0, 10) + ')')
}

// 进行缓存池维护
// - 如果缓存数量超过 1000，则删除最旧的 500 个缓存
// - 如果空间占用超过 80%，则删除最旧的 500 个缓存
async function maintainCache() {
	console.log('maintainCache')
	const cache = await cachePromise

	if (!cache) return

	const usage = await navigator.storage.estimate()

	let isAlmostFull = false

	// undefined 或者 0 都视为拿不到空间信息
	if (usage.quota && usage.usage) {
		isAlmostFull = usage.usage > usage.quota * 0.8
	}

	// 顺序是添加顺序
	const keys = await cache.keys()

	if (keys.length > 1000 || isAlmostFull) {
		console.log('maintainCache: 清理缓存', keys.length, isAlmostFull, usage)
		const deleteKeys = keys.slice(0, 500)
		await Promise.all(deleteKeys.map((key) => cache.delete(key)))
	}
}

/**
 * 兼容旧版本的 $assets:// 协议
 * @deprecated
 * @internal
 */
function legacyFix(url: string) {
	const legacyAssetReg = /^\$assets(\(.*\))?:\/\//
	if (legacyAssetReg.test(url)) {
		console.warn('$assets(*):// 协议不再支持，请改为 $asset:// 协议')
		return url.replace(legacyAssetReg, '$asset://')
	}

	return url
}
