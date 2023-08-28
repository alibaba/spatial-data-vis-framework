/**
 * Polaris App 的 runtime config
 */
export const BPConfig = {
	version: '0.0.1' as const,

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
		{
			name: 'global map',
			id: 'LOCAL_LAYER_4' as const,
			class: 'GlobalImageMapLayer' as const,
			props: {
				opacity: 0.3,
			},
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
			cameraStateCode: '1|-0.000484|0.001513|0.000000|1.06540|0.20000|17.66000',
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
		},
	],
}

export default BPConfig
