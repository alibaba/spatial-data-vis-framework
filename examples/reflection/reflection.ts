import { MercatorProjection } from '@polaris.gl/projection'
import { PolarisGSIGL2 } from '@polaris.gl/gsi-gl2'
import { PolygonLayer } from '@polaris.gl/layer-geojson'
import { GLTF2Layer } from '@polaris.gl/layer-std-gltf2'
declare let window: any

//测试数据
const testData = {
	gltfs: {
		water: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/gltf/hangzhou_water.glb',
		green: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/gltf/hangzhou_green.glb',
		road: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/gltf/hangzhou_road.glb',
		building_lod1: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/gltf/hangzhou_lod1.glb',
		building_lod2: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/gltf/hangzhou_lod2.glb',
		building_lod3: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/gltf/hangzhou_lod3.glb',
		building_lod4: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/gltf/hangzhou_lod4.glb',
	},
}

const center3D = [119.315693, 26.070336, 0] // 模型中心经纬度,取自返回数据

const p = new PolarisGSIGL2({
	container: document.querySelector('#container') as HTMLDivElement,
	width: 1000,
	height: 500,
	debug: true,
	lights: {
		ambientLight: { color: '#ffffff' },
	},
	cameraControl: true,
})
p.timeline.config.ignoreErrors = false

// 加载GLTF
const gltfLayer = new GLTF2Layer({ rotateX: false })
p.add(gltfLayer)
const gltfObject = testData.gltfs
const keys = Object.keys(gltfObject)
for (let i = 0; i < keys.length; i++) {
	const key = keys[i]
	const url = gltfObject[key] // 注意url源数据是否为空模型

	// 分类设色
	let color = '#ffffff'
	switch (key) {
		case 'water': {
			color = '#1E90FF'
			break
		}
		case 'green': {
			color = '#008000'
			break
		}
		case 'road': {
			color = '#8A2BE2'
			break
		}
		case 'building_lod1': {
			color = '#FFA07A'
			break
		}
		case 'building_lod2': {
			color = '#FF7F50'
			break
		}
		case 'building_lod3': {
			color = '#FF4500'
			break
		}
		case 'building_lod4': {
			color = '#FF0000'
			break
		}
	}

	gltfLayer.loadGLB(url).then((meshes) => {
		// 平移模型
		const centerPt = gltfLayer.projection.project(...center3D)
		for (const item1 of meshes.children.values()) {
			if (item1.children.size > 0) {
				for (const item2 of item1.children.values()) {
					// 判断是否是空模型
					if (item2.geometry !== undefined && item2.material !== undefined) {
						const positions = item2.geometry.attributes.position.array as Float32Array
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
				if (item1.geometry !== undefined && item1.material !== undefined) {
					const positions = item1.geometry.attributes.position.array as Float32Array
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
	})
}

// const polygonLayer = new PolygonLayer({
// 	getFillColor: '#ffff00',
// 	getSideColor: '#999999',
// 	getThickness: 1,
// 	enableExtrude: false,
// 	opacity: 0.2,
// 	transparent: true,
// 	baseAlt: 0,
// 	data: 'https://polaris-geo.oss-cn-hangzhou.aliyuncs.com/simple/amap/China_Fill_Dissolved_25.json',
// })
// p.add(polygonLayer)

window.p = p
window.layer = gltfLayer

window.p.setStatesCode('1|119.310764|26.073899|0.000000|0.00000|-0.03000|15')
