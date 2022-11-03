/**
 * $LAYER_NAME$
 */
import { StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'

/**
 * $LAYER_NAME$ Props
 */

export type $LAYER_NAME$Props = StandardLayerProps & {
	// 🔨 your stuffs
}

/**
 * $LAYER_NAME$ Class
 */

export class $LAYER_NAME$ extends StandardLayer {
	name = '$LAYER_NAME$' as const

	constructor(props: $LAYER_NAME$Props) {
		super(props)

		// 🔨 your stuffs
	}

	// 🔨 your stuffs
}

export function create$LAYER_NAME$(props: ConstructorParameters<typeof $LAYER_NAME$>[0]) {
	return new $LAYER_NAME$(props)
}
