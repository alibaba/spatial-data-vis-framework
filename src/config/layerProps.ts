export const layerProps = {
	// pragma: BP_GEN STAGE_LAYER_PROPS START
	LOCAL_LAYER_0: {
		width: 10000,
		height: 10000,
		lineWidth: 3,
		// opacity: 0.5,
		depthTest: false,
		depthWrite: false,
		renderOrder: -10000,
		color: '#004a75',
	},
	LOCAL_LAYER_1: {
		// glb: '/assets/models/demo.glb',
		// scale: 100.0,
		// projectionDesc: 'desc0|MercatorProjection|right|meters|0,0,0',
		// glb: 'https://gw-office.alipayobjects.com/bmw-prod/48a6249a-5136-4777-b44f-1039f4d3ce63.txt',
		glb: 'https://gw-office.alipayobjects.com/bmw-prod/e18bcdab-1b5b-416a-9780-be963b2e47a7.svg',
		projectionDesc: 'desc0|MercatorProjection|right|meters|0,0,0',
	},
	LOCAL_LAYER_2: {
		texture: 'https://img.alicdn.com/tfs/TB1tvfvMlr0gK0jSZFnXXbRRXXa-512-512.png',
		flickerSpeed: 0.1,
		pivot: [0.5, -1],
		density: 0.5,
		size: [10, 10],
		data: (() => {
			const res = [] as any[]
			const W = 100
			const H = 100
			const scale = 0.001
			for (let i = 0; i < W; i++) {
				for (let j = 0; j < H; j++) {
					res.push({
						lng: (-W / 2 + i) * scale,
						lat: (-H / 2 + j) * scale,
					})
				}
			}
			return res
		})(),
	},
	// pragma: BP_GEN STAGE_LAYER_PROPS END
}
