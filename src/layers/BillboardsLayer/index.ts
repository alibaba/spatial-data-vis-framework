import { specifyTexture } from '@gs.i/utils-specify'
import { isTexture, Texture } from '@gs.i/schema-scene'
import { StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'

import { buildBillboardsGeometry } from './BillboardsGeom'
import { BillboardsMaterial } from './BillboardsMatr'
import { Mesh } from '@gs.i/frontend-sdk'

interface Props extends StandardLayerProps {
	/**
	 * 锚点，0-1
	 * [number, number]
	 */
	pivot?: number[]

	/**
	 * 闪烁速度
	 */
	flickerSpeed?: number
	/**
	 * 闪烁密度，默认1，即全部显示
	 */
	density?: number
	/**
	 * 尺寸，单位米
	 * [number, number]
	 */
	size?: number[]

	texture: Texture | string

	data?: Data
}

type Data = { lng: number; lat: number }[]

export function createBillboardsLayer(props: Props): StandardLayer {
	const layer = new StandardLayer(props)

	const mater = new BillboardsMaterial()

	// 材质动态修改
	layer.watchProps(
		['flickerSpeed', 'density', 'size', 'texture'],
		({ props }) => {
			if (props.flickerSpeed !== undefined) mater.uniforms.flickerSpeed.value = props.flickerSpeed
			if (props.density !== undefined) mater.uniforms.density.value = props.density
			if (props.size !== undefined)
				mater.uniforms.size = { value: { x: props.size[0], y: props.size[1] } }

			if (props.texture !== undefined) {
				const texture = props.texture as any
				if (isTexture(texture)) {
					mater.baseColorTexture = texture
				} else if (typeof texture === 'string') {
					mater.baseColorTexture = specifyTexture({
						image: { uri: texture },
						sampler: { magFilter: 'LINEAR', minFilter: 'LINEAR_MIPMAP_LINEAR' },
					})
				} else {
					throw new Error('无法识别的贴图格式: ' + texture)
				}
			}
		},
		true
	)

	// layer.watchProps(['baseAlt'], e => {

	// })

	layer.addEventListener('init', (e) => {
		// 数据动态修改
		const projection = e.projection
		layer.watchProps(
			['data', 'pivot'],
			() => {
				console.log('createBillboardsLayer 重建geometry')

				const data = layer.getProp('data')
				if (!data) {
					console.log('数据未到位，放弃重建')
					return
				}
				if (!data.length) {
					console.log('数据为空，放弃重建')
					return
				}

				const pos = data.map((line) => {
					return projection.project(line.lng, line.lat)
				})

				const geom = buildBillboardsGeometry(pos, { pivot: layer.getProp('pivot') })

				const mesh = new Mesh({
					material: mater,
					geometry: geom,
				})

				mesh.extensions.EXT_mesh_order = { renderOrder: layer.getProp('renderOrder') }

				{
					const currChildren = Array.from(layer.group.children)
					currChildren.forEach((child) => {
						layer.group.remove(child)
					})
				}

				layer.group.add(mesh)
			},
			true
		)

		// 动画
		const timeline = e.timeline
		timeline.add({
			onUpdate: (t, p) => {
				mater.uniforms.time.value = t * 0.001
			},
		})
	})

	return layer
}
