import React from 'react'
import ReactDOM from 'react-dom/client'

import {
	BillboardsLayerComp,
	GlobalImageMapLayerComp,
	GridLayerComp,
	ModelLayerComp,
	PolarisAppComp, // root
} from '../../src/react'

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<PolarisAppComp
			config={{ background: 'black' }}
			statesCode="1|-0.000484|0.001513|0.000000|1.01980|0.19261|15.96550">
			<GridLayerComp
				layerProps={{
					width: 10000,
					height: 10000,
					lineWidth: 3,
					depthTest: true,
					depthWrite: false,
					renderOrder: -10000,
					color: '#004a75',
				}}
			/>
			<ModelLayerComp
				layerProps={{
					scale: 50,
					glb: 'https://raw.githubusercontent.com/alibaba/spatial-data-vis-framework/BP/base/assets/models/demo.glb',
					projectionDesc: 'desc0|MercatorProjection|right|meters|0,0,0',
				}}
			/>
			<BillboardsLayerComp
				layerProps={{
					texture: 'https://img.alicdn.com/tfs/TB1tvfvMlr0gK0jSZFnXXbRRXXa-512-512.png',
					flickerSpeed: 0.1,
					pivot: { x: 0.5, y: -1 },
					density: 0.5,
					size: { x: 10, y: 10 },
					data: (() => {
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
				}}
			/>
			<GlobalImageMapLayerComp layerProps={{ opacity: 0.3 }} />
		</PolarisAppComp>
	</React.StrictMode>
)
