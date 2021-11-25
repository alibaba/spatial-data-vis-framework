import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { HelperLayer } from '@polaris.gl/layer-std-helper'

const p = new PolarisGSIGL2({
	container: document.querySelector('#container') as HTMLDivElement,
	width: 500,
	height: 500,
})

const helperLayer = new HelperLayer()
p.add(helperLayer)

window['p'] = p
