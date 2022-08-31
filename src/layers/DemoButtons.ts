import { MarkerLayer, Marker } from '@polaris.gl/layer-std-marker'

export const isFactory = true

export function createDemoButtons() {
	const layer = new MarkerLayer()
	const buttons = [{ lng: 0.1, lat: 0.1, alt: 40, id: 'button-1' }]
	return layer
}
