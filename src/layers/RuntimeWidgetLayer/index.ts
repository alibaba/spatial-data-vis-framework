import { StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'
import { Marker, MarkerLayer } from '@polaris.gl/layer-std-marker'

export type RuntimeWidgetLayerProps = StandardLayerProps

export class RuntimeWidgetLayer extends StandardLayer {
	private markerLayer = new MarkerLayer()
	private markers = new Map<number, Marker>()
	private idPointer = 0

	constructor(props: RuntimeWidgetLayerProps) {
		super(props)

		this.add(this.markerLayer)
	}

	addWidget(element: HTMLElement, config: WidgetConfig): number {
		const id = this.idPointer
		this.idPointer++

		const marker = new Marker({
			...config,
			html: element,
		})

		this.markerLayer.add(marker)

		this.markers.set(id, marker)

		return id
	}

	removeWidget(id: number) {
		const marker = this.markers.get(id)

		if (!marker) {
			console.error(`RuntimeWidgetLayer: can not find widget id: ${id}`)
			return
		}

		this.markerLayer.remove(marker)
		this.markers.delete(id)
	}
}

export interface WidgetConfig {
	lng: number
	lat: number
	alt?: number
	offsetX?: number
	offsetY?: number
}

export function createRuntimeWidgetLayer(
	props: ConstructorParameters<typeof RuntimeWidgetLayer>[0]
) {
	return new RuntimeWidgetLayer(props)
}
