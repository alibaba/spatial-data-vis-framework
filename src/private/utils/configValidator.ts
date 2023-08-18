/**
 * BPConfig Validator
 *
 * 配置检查器
 *
 * @edited 2023-07-18
 * @file configValidator.ts
 * @description Validate Polaris App Config. Give warnings and errors if something is wrong.
 *
 * @todo 区分通用检查和阿里网络环境的检查
 * @todo 检查 Script
 * @todo 传入 AppMeta， 以检查 LayerClass 和 Prop
 * @todo 区分 开发环境 和 生产环境，开发环境能够容忍一些问题
 */

/**
 * 检查结果
 */
type Info = {
	level: 'error' | 'warning' | 'info'
	message: string
	// sourceType: 'app' | 'layer' | 'stage' | 'scene' | 'dataStub' | 'script' | 'other'
	// sourceID: string | null
}

/**
 * 检查配置文件，返回发现的问题列表，问题分为三个 level
 * - error 是配置文件的严重问题，将导致 PolarisApp 崩溃
 * - warning 会导致已知的行为异常或不稳定，发布正式前应该修复
 * - info 是值得注意或不规范的部分，但没有已知的影响
 */
export function validateConfig(config: any, env: 'dev' | 'prod' = 'prod'): Info[] {
	const infos: Info[] = []
	const error = (msg: string) => infos.push({ level: 'error', message: msg })
	const warn = (msg: string) => infos.push({ level: 'warning', message: msg })
	const info = (msg: string) => infos.push({ level: 'info', message: msg })

	const dataStubs = config.dataStubs || []
	const scripts = config.$scripts || []

	if (!config) return [{ level: 'error', message: 'No config provided.' }]
	if (typeof config !== 'object') return [{ level: 'error', message: 'Config must be an object.' }]

	// 检查关键字段

	if (!config.app) {
		error('config.app is required.')
	} else if (typeof config.app !== 'object') {
		error('config.app must be an object.')
	}

	if (!config.version) {
		error('config.version is required.')
	} else if (typeof config.version !== 'string') {
		error('config.version must be a string.')
	}

	if (config.version !== '0.0.1') {
		console.warn('This validator is designed to validate V0.0.1. May not work for other version.')
		info(`config.version is ${config.version}. validator may not be suitable for this config.`)
	}

	if (!config.layers) {
		error('config.layers is required.')
	} else if (!Array.isArray(config.layers)) {
		error('config.layers must be an array.')
	} else if (!config.layers.length) {
		error('config.layers must not be empty.')
	}

	if (!config.stages) {
		error('config.stages is required.')
	} else if (!Array.isArray(config.stages)) {
		error('config.stages must be an array.')
	} else if (!config.stages.length) {
		error('config.stages must not be empty.')
	}

	if (!config.scenes) {
		error('config.scenes is required.')
	} else if (!Array.isArray(config.scenes)) {
		error('config.scenes must be an array.')
	} else if (!config.scenes.length) {
		error('config.scenes must not be empty.')
	}

	// 以上严重错误如果出现，则停止检查，以免检查程序自身出错
	if (infos.filter((i) => i.level === 'error').length) return infos

	// 检查 Layer 数据结构

	config.layers.forEach((layer, i) => {
		if (!layer.id) error(`config.layers[${i}].id is required`)
		if (typeof layer.id !== 'string') error(`config.layers[${i}].id is not string`)
		if (!layer.class) error(`config.layers[${i}].class is required`)
		if (typeof layer.class !== 'string') error(`config.layers[${i}].class is not string`)
		if (!layer.name) error(`config.layers[${i}].name is required`)
		if (typeof layer.name !== 'string') error(`config.layers[${i}].name is not string`)
		if (!layer.props) error(`config.layers[${i}].props is required`)
		if (typeof layer.props !== 'object') error(`config.layers[${i}].props is not object`)
	})

	//
	if (infos.filter((i) => i.level === 'error').length) return infos

	// 检查 Layer Props 的值

	infos.push(...checkWebResource(config))

	// 检查 Stage 数据结构

	const mainStages = config.stages.filter((stage) => stage.id === 'LOCAL_STAGE_MAIN')
	if (mainStages.length !== 1) error('Main Stage 有且只能有一个')

	// 检查 Scene 数据结构

	const defaultScenes = config.scenes.filter((scene) => scene.id === 'LOCAL_SCENE_DEFAULT')
	if (defaultScenes.length !== 1) error('Default Scene 有且只能有一个')

	config.scenes.forEach((scene, i) => {
		if (!scene.id) error(`config.scenes[${i}].id is required`)
		if (!scene.name) error(`config.scenes[${i}].name is required`)
		if (!scene.layers) error(`config.scenes[${i}].layers is required`)
		if (!scene.layers.length)
			error(`config.scenes[${i}].layers is required to have at least one layer`)
	})

	// 检查 DataStub 数据结构

	dataStubs.forEach((dataStub, i) => {
		if (!dataStub.id) error(`dataStubs[${i}].id is required`)
		if (!dataStub.name) error(`dataStubs[${i}].name is required`)
	})

	// 检查 ID 是否冲突

	const conflictLayerIds = findConflictIds(config.layers)
	if (conflictLayerIds.length) {
		error(`Layer ID conflict: ${conflictLayerIds.join(', ')}`)
	}

	const conflictStageIds = findConflictIds(config.stages)
	if (conflictStageIds.length) {
		error(`Stage ID conflict: ${conflictStageIds.join(', ')}`)
	}

	const conflictSceneIds = findConflictIds(config.scenes)
	if (conflictSceneIds.length) {
		error(`Scene ID conflict: ${conflictSceneIds.join(', ')}`)
	}

	const conflictDataStubIds = findConflictIds(dataStubs)
	if (conflictDataStubIds.length) {
		error(`DataStub ID conflict: ${conflictDataStubIds.join(', ')}`)
	}

	const conflictScriptIds = findConflictIds(scripts)
	if (conflictScriptIds.length) {
		error(`Script ID conflict: ${conflictScriptIds.join(', ')}`)
	}

	//
	if (infos.filter((i) => i.level === 'error').length) return infos

	// 检查 Stage 对 Layer 的引用

	config.stages.forEach((stage, i) => {
		stage.layers.forEach((layerId) => {
			if (layerId === '*') return

			const layer = config.layers.find((l) => l.id === layerId)
			if (!layer) warn(`stages(${stage.id}) 引用了不存在的 layer(${layerId})`)
		})
	})

	// 检查 Scene 对 Stage / Layer 的引用

	config.scenes.forEach((scene, i) => {
		if (scene.stage) {
			const stage = config.stages.find((s) => s.id === scene.stage)
			if (!stage) error(`scenes(${scene.id}) 引用了不存在的 stage(${scene.stage})`)
		}

		scene.layers.forEach((layerId) => {
			if (layerId === '*') return

			const layer = config.layers.find((l) => l.id === layerId)
			if (!layer) warn(`scenes(${scene.id}) 引用了不存在的 layer(${layerId})`)
		})
	})

	// 检查 Layer 对 DataStub 的引用

	const usedDataStubIDs = new Set()

	config.layers.forEach((layer, i) => {
		if (layer.dataProps) {
			Object.values(layer.dataProps).forEach((dataStubID) => {
				usedDataStubIDs.add(dataStubID)
				const dataStub = dataStubs.find((d) => d.id === dataStubID)
				if (!dataStub) error(`layers(${layer.id}) 引用了不存在的 dataStub(${dataStubID})`)
			})
		}
	})

	// 检查 未使用的 DataStub

	const allDataStubIDs = new Set(dataStubs.map((d) => d.id))
	const unusedDataStubIDs = Array.from(allDataStubIDs).filter((id) => !usedDataStubIDs.has(id))
	if (unusedDataStubIDs.length) {
		unusedDataStubIDs.forEach((id) => {
			warn(`dataStub(${id}) 未被使用`)
		})
	}

	// 检查 未使用的 Layer

	const allLayerIDs = new Set(config.layers.map((l) => l.id))
	const usedLayerIDs = new Set(config.scenes.map((s) => s.layers).flat())
	if (!usedLayerIDs.has('*')) {
		const unusedLayerIDs = Array.from(allLayerIDs).filter((id) => !usedLayerIDs.has(id))
		if (unusedLayerIDs.length) {
			unusedLayerIDs.forEach((id) => {
				warn(`layer(${id}) 未被使用`)
			})
		}
	}

	// 检查 未使用的 Stage

	// 检查 无法 JSON.stringify 的数据类型（function infinity nan typedarray）

	return infos
}

function findConflictIds(objects: { id: string }[]) {
	if (objects.length === 0) return []

	const ids = objects.map((o) => o.id)

	ids.sort()

	if (ids.length < 2) return []

	const conflictIds = new Set()

	let last = ids[0]
	for (let i = 1; i < ids.length; i++) {
		const curr = ids[i]

		if (curr === last) {
			conflictIds.add(curr)
		} else {
			last = curr
		}
	}

	return Array.from(conflictIds) as string[]
}

/**
 * 检查所有 props 中的网络资源
 */
function checkWebResource(config) {
	const infos: Info[] = []
	const warn = (msg: string) => infos.push({ level: 'warning', message: msg })

	config.layers.forEach((layer, i) => {
		const { props } = layer

		Object.entries(props).forEach(([key, value]) => {
			// 没有 App Meta 的情况下其实无法检查 Prop 数据，这里只检查网络请求

			if (typeof value !== 'string') return

			const isWebResource =
				value.startsWith('http://') || value.startsWith('https://') || value.startsWith('//')

			if (!isWebResource) return

			let url: URL
			try {
				url = new URL(value)
			} catch (_) {
				return
			}

			const host = url.host
			const pathname = url.pathname

			// const isUnsecure = value.startsWith('http://')
			const isTempFile = pathname.includes('/api/temp_files/')
			const isLocalFile = host.includes('localhost') || host.includes('127.0.0.1')
			const isGithubContent = host.includes('githubusercontent.com')
			const isDevServer =
				// 带端口号的地址
				host.includes(':') ||
				// 常用的非线上域名
				host.startsWith('dev.') ||
				host.startsWith('dev-') ||
				host.startsWith('pre-') ||
				host.startsWith('pre1-') ||
				host.startsWith('pre2-') ||
				host.startsWith('pre3-') ||
				host.startsWith('pre.') ||
				host.startsWith('pre1.') ||
				host.startsWith('pre2.') ||
				host.startsWith('pre3.') ||
				host.startsWith('test-') ||
				host.startsWith('test.') ||
				host.startsWith('daily-') ||
				host.startsWith('daily.')

			if (isTempFile) {
				warn(
					`config.layers[${i}].props.${key} 使用了临时地址，过期将失效，请在正式使用前改为稳定地址.`
				)
			}

			if (isLocalFile) {
				warn(`config.layers[${i}].props.${key} 使用了本地地址，正式使用前请改为稳定地址.`)
			}

			if (isGithubContent) {
				warn(`config.layers[${i}].props.${key} 使用了 Github 地址，可能被墙或被外部用户修改.`)
			}

			if (isDevServer) {
				warn(`config.layers[${i}].props.${key} 使用了开发环境地址，正式使用前请改为稳定地址.`)
			}
		})
	})

	return infos
}
