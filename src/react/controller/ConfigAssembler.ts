import { createContext, useContext, useEffect, useRef, useState } from 'react'

import { ConfigManager } from '../../private/config/ConfigManager'
import { AppPolarisConfig, LayerConfig } from '../../private/schema/config'

/**
 * ConfigAssembler
 * config 拼装器
 */
export class ConfigAssembler {
	private disposed = false

	constructor(private configManager: ConfigManager<any>) {}

	updateApp(config: AppPolarisConfig) {
		if (this.disposed) {
			console.error('ConfigAssembler is disposed')
			return
		}

		this.configManager.action({
			type: 'app:change',
			payload: config,
		})
	}

	updateProjectionDesc(desc: string) {
		if (this.disposed) {
			console.error('ConfigAssembler is disposed')
			return
		}

		this.configManager.action({
			type: 'stage:change:projection',
			payload: {
				id: 'LOCAL_STAGE_MAIN',
				projection: desc,
			},
		})
	}

	addLayer(config: LayerConfig) {
		if (this.disposed) {
			console.error('ConfigAssembler is disposed')
			return
		}

		this.configManager.action({
			type: 'layer:add',
			payload: config,
		})
	}

	removeLayer(id: string) {
		if (this.disposed) {
			console.error('ConfigAssembler is disposed')
			return
		}

		this.configManager.action({
			type: 'layer:remove',
			payload: { id },
		})
	}

	updateLayerProps(id: string, props: LayerConfig['props']) {
		if (this.disposed) {
			console.error('ConfigAssembler is disposed')
			return
		}

		this.configManager.action({
			type: 'layer:change:props',
			payload: { id, props: props },
		})
	}

	// https://gitlab.alibaba-inc.com/dt-vis/polaris-studio-editor/-/blob/0b55b0b5d62dc09b444190f63be723b739ba6ded/src/utils/id.ts#L85
	genLayerID() {
		if (this.disposed) {
			throw new Error('ConfigAssembler is disposed')
		}

		const layers = this.configManager.getConfig().layers
		if (!layers) {
			throw new Error('genLayerID: layers not found in config.')
		}

		const ids = layers.map((s) => s.id)

		const MAX_TRY = 1000
		let tryCount = 0

		let newID = `LOCAL_LAYER_${randomString(5)}` // 916_132_832 种可能
		while (ids.includes(newID)) {
			newID = `LOCAL_LAYER_${randomString(5)}`

			tryCount++
			if (tryCount > MAX_TRY) {
				throw new Error('genLayerID: Failed to generate ID. MAX_TRY reached.')
			}
		}

		return newID
	}

	dispose() {
		this.disposed = true
	}
}

// context

export const ConfigAssemblerContext = createContext<ConfigAssembler | null>(null)

// custom hooks

export function useLayer(name: string, layerClass: string, props: any) {
	const configAssembler = useContext(ConfigAssemblerContext)

	const disposed = useRef(false)

	const [id, setId] = useState<string | null>(null)

	const propsRef = useRef(props)
	useEffect(() => {
		propsRef.current = props
	}, [props])

	useEffect(() => {
		if (!configAssembler || !id) return

		if (disposed.current) return

		configAssembler.updateLayerProps(id, props)
	}, [configAssembler, id, props])

	useEffect(() => {
		if (!configAssembler) {
			// throw new Error(
			// 	'configAssembler not available. useLayer must be used within a ConfigAssemblerProvider'
			// )
			// console.log('%cuseLayer:: configAssembler not ready. will skip.', 'color: red')
			return
		}

		// console.log('%cadd Layer', 'color: green', name, layerClass, props)

		const id = configAssembler.genLayerID()
		setId(id)

		configAssembler.addLayer({
			name,
			id,
			class: layerClass,
			props: propsRef.current,
		})

		return () => {
			configAssembler.removeLayer(id)
			disposed.current = true
		}
	}, [configAssembler, name, layerClass])
}

// utils

// https://gitlab.alibaba-inc.com/dt-vis/polaris-studio-editor/-/blob/0b55b0b5d62dc09b444190f63be723b739ba6ded/src/utils/random.ts#L6

const dict = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/**
 * 生成随机字符串，包含大小写英文字母和数字
 */
function randomString(len: number) {
	len = len || 32
	const a = dict.length
	let n = ''
	for (let i = 0; i < len; i++) n += dict.charAt(Math.floor(Math.random() * a))
	return n
}
