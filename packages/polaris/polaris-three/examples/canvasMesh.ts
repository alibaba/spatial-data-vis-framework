import { StandardLayer } from '@polaris.gl/gsi'
import { PolarisThree } from '../src/index'

import { generateScene } from '@gs.i/utils-random-scene'
import { IndicatorProcessor } from '@gs.i/processor-indicator'

import * as THREE from 'three-lite'
import CanvasMesh from '../dist/renderer/pipeline/CanvasMesh'

const p = new PolarisThree({
	container: document.querySelector('#container') as HTMLDivElement,
	background: 'white',
	// autoplay: false,
})

globalThis.p = p

console.log(THREE)
// globalThis.THREE = THREE

const mesh = new CanvasMesh({}, THREE)

// const l = new StandardLayer({})
// l.group.add()
