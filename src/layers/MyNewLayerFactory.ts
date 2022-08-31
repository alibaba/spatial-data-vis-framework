import { StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'

export const isFactory = true

export function createMyNewLayer() {
	return new StandardLayer({})
}
