import { StandardLayer } from '@polaris.gl/base-gsi'
import { PolarisLite } from '@polaris.gl/lite'

import { IndicatorProcessor } from '@gs.i/processor-indicator'
import { Color } from '@gs.i/utils-math'
import { HelperLayer } from '@polaris.gl/layer-std-helper'
import { GLTF2Layer } from '@polaris.gl/layer-std-gltf2'

import * as IR from '@gs.i/schema-scene'

//测试数据
const testData = {
	gltfs: {
		water: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/gltf/hangzhou_water.glb',
		green: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/gltf/hangzhou_green.glb',
		road: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/gltf/hangzhou_road.glb',
		// building_lod1: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/gltf/hangzhou_lod1.glb',
		building_lod2: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/gltf/hangzhou_lod2.glb',
		building_lod3: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/gltf/hangzhou_lod3.glb',
		// building_lod4: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/gltf/hangzhou_lod4.glb',
	},
}

const center3D = [119.315693, 26.070336, 0] as const // 模型中心经纬度,取自返回数据

await test(true, 'PolarisLite', () => {
	const p = new PolarisLite({
		container: document.querySelector('#container') as HTMLDivElement,
		background: 'transparent',
		// autoplay: false,
	})

	p.setStatesCode('1|119.310764|26.073899|0.000000|0.00000|-0.03000|15')

	const h = new HelperLayer({ parent: p })
	h.setProps({ box: false })

	// p.addEventListener('viewChange', (e) => {
	// 	console.log(e)
	// })
	globalThis.p = p
	console.log(p)

	// 加载GLTF
	const gltfLayer = new GLTF2Layer({ rotateX: false })
	p.add(gltfLayer)
	const gltfObject = testData.gltfs
	const keys = Object.keys(gltfObject)
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i]
		const url = gltfObject[key] // 注意url源数据是否为空模型

		// 分类设色
		let color = new Color('#ffffff')
		switch (key) {
			case 'water': {
				color = new Color('#1E90FF')
				break
			}
			case 'green': {
				color = new Color('#008000')
				break
			}
			case 'road': {
				color = new Color('#8A2BE2')
				break
			}
			case 'building_lod1': {
				color = new Color('#FFA07A')
				break
			}
			case 'building_lod2': {
				color = new Color('#FF7F50')
				break
			}
			case 'building_lod3': {
				color = new Color('#FF4500')
				break
			}
			case 'building_lod4': {
				color = new Color('#FF0000')
				break
			}
		}

		gltfLayer.loadGLB(url).then((meshes) => {
			const projection = gltfLayer.resolveProjection()
			if (projection) {
				// 平移模型
				const centerPt = projection.project(...center3D)
				for (const item1 of meshes.children.values()) {
					if (item1.children.size > 0) {
						for (const item2 of item1.children.values()) {
							// 判断是否是空模型
							if (IR.isRenderable(item2)) {
								const positions = item2.geometry.attributes.position?.array as Float32Array
								for (let i = 0; i < positions.length / 3; i++) {
									positions[i * 3] += centerPt[0]
									positions[i * 3 + 1] += centerPt[1]
									positions[i * 3 + 2] += centerPt[2]
								}
								// 改变颜色
								item2.material['baseColorFactor'] = color
								item2.material['roughnessFactor'] = 0.5
								item2.material['metallicFactor'] = 0.1
							}
						}
					} else {
						// 判断是否是空模型
						if (IR.isRenderable(item1)) {
							const positions = item1.geometry.attributes.position?.array as Float32Array
							for (let i = 0; i < positions.length / 3; i++) {
								positions[i * 3] += centerPt[0]
								positions[i * 3 + 1] += centerPt[1]
								positions[i * 3 + 2] += centerPt[2]
							}
							// 改变颜色
							item1.material['baseColorFactor'] = color
							item1.material['roughnessFactor'] = 0.5
							item1.material['metallicFactor'] = 0.1
						}
					}
				}
			} else {
				console.warn('layer not inited')
			}
		})
	}
})

// ===

async function test(enable: boolean, name: string, fun: () => void, duration = 1000) {
	if (!enable) return
	console.group(name)
	fun()
	await new Promise((resolve, reject) => {
		setTimeout(() => resolve(true), duration)
	})
	console.log(`test end (${name})`)
	console.groupEnd()
	return
}
