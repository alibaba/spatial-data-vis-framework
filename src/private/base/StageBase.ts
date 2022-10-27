import { StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'
import { occupyID } from '../utils/unique'
// import { Projection } from '@polaris.gl/projection'
// import Timeline from 'ani-timeline'

/**
 * 舞台设定（容器Layer）
 */

// export class StageBase {
// 	readonly stageLayer: StandardLayer
// 	readonly timeline: Timeline
// 	readonly projection: Projection

// 	private ready: boolean = false
// 	private visible: boolean = true

// 	constructor() {}

// 	async init() {
// 		this.ready = true
// 	}
// 	unload(){}

// 	show() {
// 		if (this.visible) return
// 		this.stageLayer.visible = true
// 		this.visible = true
// 	}
// 	hide() {}
// }

/**
 * 舞台设定（容器Layer）
 * @note Stage 拥有独立projection，这样可以避免每个Layer独立设置Projection
 *
 * @todo
 * Stage 是否需要独立 timeline 来做性能优化？会带来一些问题：
 * - timeline多实例并存是否会带来问题？
 * - 是否受 polaris timeline的影响？
 * - 是否是可选的？
 *
 * 可能方案：
 * - pauseTimeWhenInvisible开关，如果打开则使用独立timeline，否则继承
 * - 如果使用独立timeline，依然从 polaris.timeline 复制其他参数，并且同步状态
 *
 * 结论：
 * 目前看来是个可选的性能优化点，出现需求再作为额外功能，#MPV从简
 */

/**
 * Stage 舞台/阶段
 *
 * @note 用于复杂场景编排和动态资源加载，暂时不用透出
 *
 * Stage
 * - 舞台或者阶段，是一系列 Layer 的容器，也是 Scene（场景）所在的环境
 * - 搭建的主要功能就是将各种元素放置在舞台上
 * - 暂时只使用主舞台一个 stage，所有的 layer 实例都放在 mainStage 中，所有的 scene 都使用 mainStage
 */
export class StageBase<TLayerList extends LayerList = LayerList> extends StandardLayer {
	name: string
	id: string

	layers: TLayerList

	constructor(props: StageProps<TLayerList>) {
		const { layers, projection, name, id } = props
		super({ projection })

		this.name = name
		this.id = id

		occupyID(id, true)

		this.layers = layers

		layers.forEach((layer) => {
			this.add(layer.layer)
		})
	}

	/**
	 * 控制stage中layer的显示和隐藏
	 */
	filterLayers(visibleLayerIDs: readonly TLayerList[number]['id'][]) {
		if (visibleLayerIDs.includes('*')) {
			// 全部显示
			this.layers.forEach((layer) => {
				layer.layer.visible = true
			})
		} else {
			// ID 过滤
			this.layers.forEach((layer) => {
				if (visibleLayerIDs.includes(layer.id)) {
					layer.layer.visible = true
				} else {
					layer.layer.visible = false
				}
			})
		}
	}

	getLayer<ID extends TLayerList[number]['id']>(id: ID): GetLayerFromList<TLayerList, ID> {
		return this.layers.find((l) => l.id === id) as any
	}
}

export type StageProps<TLayerList extends LayerList> = Pick<StandardLayerProps, 'projection'> & {
	layers: TLayerList
	name: string
	id: string
}

export type LayerList = readonly {
	name?: string
	id: string
	layer: StandardLayer
}[]

/**
 * LayerList to id map
 */
type LayerMap<T extends LayerList> = {
	[Item in T[number] as Item['id']]: Item
}

/**
 * find layer from layerList by ID
 */
type GetLayerFromList<T extends LayerList, ID extends LayerList[number]['id']> = LayerMap<T>[ID]
