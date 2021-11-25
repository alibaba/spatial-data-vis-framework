/* eslint-disable @typescript-eslint/no-unused-vars */
import { Layer } from '@polaris.gl/core-layer'
import { ThreeView } from '@polaris.gl/view-three'
import { Mesh } from 'three'

// import { Polaris } from '@polaris.gl/core-polaris'
// import { GL2Renderer, GL2, Mesh } from '@polaris.gl/renderer-gl2'

// const polaris = new Polaris({
// 	container: document.querySelector('#container'),
// 	renderer: new GL2Renderer(),
// })

import { PolarisLite } from '@polaris.gl/polaris-lite'

const polaris = new PolarisLite({
	container: document.querySelector('#container'),
})

class ALayer extends Layer {
	view = { three: new ThreeView() }
	constructor(params) {
		super(params)
		this.view.three.group.add(new Mesh())
	}
}

const wrapper = new Layer({ parent: polaris, view: new ThreeView() })

const aLayer = new ALayer({ parent: wrapper })
