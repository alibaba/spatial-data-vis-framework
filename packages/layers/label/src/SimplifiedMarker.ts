import { Box2 } from '@gs.i/utils-math'
import { Marker } from '@polaris.gl/layer-std-marker'

export class SimplifiedMarker extends Marker {
	// the actual visibility prop to control whether label will be drawn or not
	labelVisible: boolean
	labelBox: Box2
	label: string
	style: any
	feature: any
	translateX: number
	translateY: number
	alpha: number

	constructor(props) {
		const _props = {
			...props,
		}
		_props.autoHide = false
		_props.html = undefined
		_props.highPerfMode = false
		super(_props)
		this.labelVisible = false
		this.labelBox = new Box2()
		this.alpha = 1.0
		this.label = _props.label
		this.style = _props.style
		this.feature = _props.feature
		this.translateX = this.style.text_translate_x
		this.translateY = this.style.text_translate_y
	}

	update(props) {
		this.labelVisible = false
		this.labelBox = new Box2()
		this.label = props.label ?? this.label
		this.style = props.style ?? this.style
		this.feature = props.feature ?? this.feature
		this.translateX = this.style.text_translate_x ?? this.translateX
		this.translateY = this.style.text_translate_y ?? this.translateY
		this.alpha = 1.0
		this.updateProps(props)
	}
}
