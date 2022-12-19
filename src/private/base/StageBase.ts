import { StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'

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
export class StageBase extends StandardLayer {
	name: string
	id: string

	private readonly layerInfo = new WeakMap<StandardLayer, { name: string; id: string }>()

	constructor(props: StageProps) {
		const { layers, projection, name, id } = props
		super({ projection })

		this.name = name
		this.id = id

		layers.forEach(({ name, id, layer }) => {
			this.addLayer(id, layer, name)
		})
	}

	/**
	 * 控制stage中layer的显示和隐藏
	 */
	filterLayers(visibleLayerIDs: readonly string[]) {
		if (visibleLayerIDs.includes('*')) {
			// 全部显示
			this.children.forEach((layer) => {
				layer.visible = true
			})
		} else {
			// ID 过滤
			this.children.forEach((layer) => {
				const layerID = this.layerInfo.get(layer)?.id
				if (layerID !== undefined) {
					layer.visible = visibleLayerIDs.includes(layerID)
				} else {
					throw new Error(
						`layerInfo not found, make sure all the layers are added by "stage.addLayer": ${layerID}`
					)
				}
			})
		}
	}

	getLayerList(): LayerList {
		return Array.from(this.children).map((layer) => {
			const info = this.layerInfo.get(layer)
			if (!info) {
				throw new Error(
					`layerInfo not found, make sure all the layers are added by "stage.addLayer": ${layer}`
				)
			}
			return { id: info.id, name: info.name, layer }
		})
	}

	getLayer(id: string): StandardLayer | undefined {
		for (const layer of this.children) {
			if (this.layerInfo.get(layer)?.id === id) {
				return layer
			}
		}

		return undefined
	}

	addLayer(id: string, layer: StandardLayer, name = 'unnamed') {
		super.add(layer)
		this.layerInfo.set(layer, { name, id })
	}

	removeLayer(id: string) {
		const layer = this.getLayer(id)
		if (layer) {
			super.remove(layer)
			this.layerInfo.delete(layer)
		}
	}
}

export interface StageBase {
	add: never
	remove: never
	removeAll: never
}

export type StageProps<TLayerList extends LayerList = LayerList> = Pick<
	StandardLayerProps,
	'projection'
> & {
	layers: TLayerList
	name: string
	id: string
}

export type LayerList = {
	name: string
	id: string
	layer: StandardLayer
}[]
