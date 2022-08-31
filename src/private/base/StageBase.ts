import { StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'
import { Projection } from '@polaris.gl/projection'
import Timeline from 'ani-timeline'
import { occupyID } from '../utils/unique'

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

export class StageBase extends StandardLayer {
	name: string
	id: string

	layers: LayerList

	constructor(props: StageProps) {
		const { layers, projection, name, id } = props
		super({ projection })

		this.name = name || 'New Stage'
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
	filterLayers(visibleLayerIDs: string[]) {
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
}

export type StageProps = Pick<StandardLayerProps, 'projection'> & {
	layers: LayerList
	name?: string
	id: string
}

export type LayerList = readonly {
	name?: string
	id: string
	layer: StandardLayer
}[]
