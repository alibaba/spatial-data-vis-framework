// import type { AppConfig } from '../apps/App'

/**
 * Polaris App 的 runtime config
 */
export const BPConfig = {
	version: '0.0.1' as const,

	/**
	 * runtime mutable config
	 *
	 * 运行时可以编辑的配置，可以在搭建工具中直接修改，也可以由第三方平台，通过高级接口运行时控制
	 */

	/** 应用全局配置 @note 命名待定: 'app' or 'polaris' ? */
	app: {
		width: 1000,
		height: 700,
		fov: 20,
		antialias: 'msaa' as const,
		background: 'transparent',
		autoResize: false,
		pitchLimit: [0, Math.PI * 0.7],
		initialScene: 'LOCAL_SCENE_DEFAULT' as const,
		debug: true,
	},
	/** 所有 layer 实例，以及每个的配置项 */
	layers: [
		{
			name: 'helper grid',
			id: 'LOCAL_LAYER_0' as const,
			class: 'GridLayer' as const,
			props: {
				width: 10000,
				height: 10000,
				lineWidth: 3,
				depthTest: true,
				depthWrite: false,
				renderOrder: -10000,
				color: '#004a75',
			},
		},
		{
			name: 'model',
			id: 'LOCAL_LAYER_1' as const,
			class: 'ModelLayer' as const,
			props: {
				scale: 50,
				glb: 'https://raw.githubusercontent.com/alibaba/spatial-data-vis-framework/BP/base/assets/models/demo.glb',
				projectionDesc: 'desc0|MercatorProjection|right|meters|0,0,0',
			},
		},
		{
			name: 'sparkles',
			id: 'LOCAL_LAYER_2' as const,
			class: 'BillboardsLayer' as const,
			props: {
				texture: 'https://img.alicdn.com/tfs/TB1tvfvMlr0gK0jSZFnXXbRRXXa-512-512.png',
				flickerSpeed: 0.1,
				pivot: { x: 0.5, y: -1 },
				density: 0.5,
				size: { x: 10, y: 10 },
			},
			dataProps: {
				data: 'LOCAL_DATA_0',
			},
		},
		{
			name: 'runtime widget demo',
			id: 'LOCAL_LAYER_3' as const,
			class: 'RuntimeWidgetLayer' as const,
			props: {},
		},
	],
	/** 所有 stage（layer 实例的容器） */
	stages: [
		/**
		 * 注意一个layer实例只能从属于一个stage
		 */
		{
			name: 'MainStage',
			id: 'LOCAL_STAGE_MAIN',
			layers: ['*'],
			projection: undefined,
		},
	],
	/** 所有 scene（用户编排的一组状态，用于控制镜位和layer显隐切换） */
	scenes: [
		{
			id: 'LOCAL_SCENE_DEFAULT',
			name: 'DefaultScene',
			cameraStateCode: '1|-0.000500|0.001524|0.000000|1.06540|0.20000|17.66000',
			stage: 'LOCAL_STAGE_MAIN' as const,
			layers: ['*' /* 显示该stage的所有layer */],
		},
		{
			id: 'LOCAL_SCENE_2',
			name: 'scene2',
			cameraStateCode: '1|0.000200|0.000943|0.000000|0.99540|-0.48000|18.27600',
			stage: 'LOCAL_STAGE_MAIN' as const,
			layers: ['LOCAL_LAYER_1', 'LOCAL_LAYER_3'],
		},
	],

	/**
	 * 数据源
	 * @note 命名待定：'dataSources' or 'dataStubs' ?
	 */
	dataStubs: [
		{
			id: 'LOCAL_DATA_0',
			name: 'sparkle positions',
			initialValue: (() => {
				const res = [] as any[]
				const W = 3
				const H = 3
				const scale = 0.0015
				for (let i = 0; i < W; i++) {
					for (let j = 0; j < H; j++) {
						res.push({
							lng: +((-W / 2 + i) * scale).toFixed(3),
							lat: +((-H / 2 + j) * scale).toFixed(3),
						})
					}
				}
				return res
			})(),
			dynamic: false,
		},
	],

	/**
	 * 脚本系统
	 * @experimental
	 */
	$scripts: [
		{
			name: 'script 0',
			id: 'LOCAL_SCRIPT_0',
			type: 'bus' as const,
			eventType: 'scriptInit' as const,
			handler: /* javascript */ `
				/**
				 * 这里是 scriptInit 事件的回调函数体
				 * @context
				 * 环境变量包括：
				 * - event: ScriptInitEvent
				 */

				console.log('I am a init-ing script!')
				const eventType = event.type // 'scriptInit'
				const busAgent = event.busAgent
				
				busAgent.on('beforeSceneChange', (event) => {
					console.log('beforeSceneChange', event) // BeforeSceneChangeEvent
				})
			`,
		},
	],

	/**
	 * readonly config
	 *
	 * 静态只读配置项，
	 * 该部分配置项的修改对应着源文件的修改，由本地脚本操作，需要重新打包应用才能生效。
	 *
	 * 这部分可以放到 app 里，做一个 getter，而非放到这个配置项里，因为他并不是施加给app的，而是app内在的
	 */
}

export default BPConfig

/**
 * @QA layerClasses
 *
 * @Q 是否需要从这个配置出码？如果不需要，则不需要 dependence 相关的信息
 * @A 这部分配置是为了能找到一个class的工厂函数或者constructor，不出码，可以假设同一个函数可以找到对应的类
 *
 * @Q 如何找到这个class？是否要求标准目录？还是在生成阶段就挂到全局变量上？
 * @A 要看如何实例化这些类
 * - 用法A：过程实例化，
 * 即 从 layers 和 stages 出码，这样可以得到更可读的代码，而且可以 tree shaking，
 * 问题是 修改 layer 和 stages 需要重新打包。目前不朝这个方向做。
 * - 用法B：配置动态实例化
 * 需要把所有的工厂函数挂到一个统一的地方，在 private 里根据 stages 和 layers 动态创建。
 * @A 目前使用*用法B*
 */
