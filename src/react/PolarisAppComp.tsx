import { useEffect, useRef, useState } from 'react'

import { App } from '../apps/App'
import { deepFreeze } from '../private/config/utils/deepFreeze'
import { AppConfig } from '../private/schema/config'
import { ConfigAssembler, ConfigAssemblerContext } from './controller/ConfigAssembler'

type Props = {
	/**
	 * AppConfig.app
	 * 画布宽高等配置
	 */
	config?: AppConfig['app']

	/**
	 * 相机状态码
	 * - 形如 `1|-0.000484|0.001513|0.000000|1.06540|0.20000|17.66000`
	 * - 其中 `1|longitude|latitude|altitude|pitch|rotation|zoom`
	 */
	statesCode?: string

	/**
	 * layers config
	 */
	children?: any
}

export function PolarisAppComp(props: Props) {
	const polarisApp = useRef<App | null>(null)
	const container = useRef<HTMLDivElement>(null!)

	const [configAssembler, setConfigAssembler] = useState<ConfigAssembler | null>(null)

	const initialConfig = useRef<AppConfig>(INITIAL_CONFIG)

	useEffect(() => {
		initialConfig.current = {
			...initialConfig.current,
			app: { ...initialConfig.current.app, ...(props.config || {}) },
		}
	}, [props.config])

	// main
	useEffect(() => {
		if (!container.current) return

		if (!initialConfig.current) throw new Error('PolarisAppComp::#84a335')

		console.log('%cPolarisAppComp::initing', 'color: green')
		const app = new App(container.current, initialConfig.current)
		polarisApp.current = app

		globalThis['polarisApp'] = app

		const configAssembler = new ConfigAssembler(app.configManager)
		setConfigAssembler(configAssembler)

		return () => {
			console.log('%cPolarisAppComp::disposing', 'color: red')
			app.dispose()
		}
	}, [])

	// update app config
	useEffect(() => {
		if (!configAssembler) return

		console.log('%cPolarisAppComp::config.app updated', 'color: blue', props.config)
		configAssembler.updateApp({ ...INITIAL_CONFIG.app, ...(props.config || {}) })
	}, [configAssembler, props.config])

	// update camera state
	useEffect(() => {
		const app = polarisApp.current
		if (!app) return
		if (!props.statesCode) return

		console.log('%cPolarisAppComp::camera state updated', 'color: blue', props.statesCode)
		app.polaris.setStatesCode(props.statesCode)
	}, [props.statesCode])
	return (
		<ConfigAssemblerContext.Provider value={configAssembler}>
			<div ref={container}></div>

			{props.children}
		</ConfigAssemblerContext.Provider>
	)
}

/**
 * 默认配置
 */
const INITIAL_CONFIG: AppConfig = deepFreeze({
	version: '0.0.1',
	app: {
		width: 1000,
		height: 700,
		fov: 20,
		antialias: 'msaa' as const,
		background: 'transparent',
		autoResize: false,
		pitchLimit: [0, Math.PI * 0.7],
		initialScene: 'LOCAL_SCENE_DEFAULT' as const,
	},
	layers: [],
	stages: [
		{
			name: 'MainStage',
			id: 'LOCAL_STAGE_MAIN',
			layers: ['*'],
			projection: undefined,
		},
	],
	scenes: [
		{
			id: 'LOCAL_SCENE_DEFAULT',
			name: 'DefaultScene',
			cameraStateCode: '1|-0.000484|0.001513|0.000000|1.06540|0.20000|17.66000',
			stage: 'LOCAL_STAGE_MAIN' as const,
			layers: ['*' /* 显示该stage的所有layer */],
		},
	],
	dataStubs: [],
})
