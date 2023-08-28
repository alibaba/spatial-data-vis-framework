import { Mesh } from '@gs.i/frontend-sdk'
import { Texture, isTexture } from '@gs.i/schema-scene'
import { Color } from '@gs.i/utils-math'
import { specifyTexture } from '@gs.i/utils-specify'

import { StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'

import { buildBillboardsGeometry } from './BillboardsGeom'
import { BillboardsMaterial } from './BillboardsMatr'
import { propsDesc } from './propsDesc'

export { propsDesc }

export const info = {
	name: 'Billboards Scatters',
	description:
		'Draw Mass amount of billboards that face the camera. Used for markers, heatmap, deco, particle effects etc.',
	category: 'Internal',
}

interface Props extends StandardLayerProps {
	/**
	 * 锚点，0-1
	 */
	pivot?: { x: number; y: number }

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
	 */
	size?: { x: number; y: number }

	texture: Texture | string
	color?: { r: number; g: number; b: number } | string

	data?: Data
}

type Data = { lng: number; lat: number }[]

export function createBillboardsLayer(props: Props): StandardLayer {
	const layer = new StandardLayer(props)

	const matr = new BillboardsMaterial()

	// 材质动态修改
	layer.watchProps(
		['flickerSpeed', 'density', 'size', 'texture', 'color'],
		({ props }) => {
			if (props.flickerSpeed !== undefined) matr.uniforms.flickerSpeed.value = props.flickerSpeed
			if (props.density !== undefined) matr.uniforms.density.value = props.density
			if (props.size !== undefined)
				matr.uniforms.size = { value: { x: props.size.x, y: props.size.y } }
			if (props.color !== undefined) matr.baseColorFactor = new Color(props.color as any)

			if (props.texture !== undefined) {
				const texture = props.texture as any
				if (isTexture(texture)) {
					matr.baseColorTexture = texture
				} else if (typeof texture === 'string') {
					matr.baseColorTexture = specifyTexture({
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
					material: matr,
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
				matr.uniforms.time.value = t * 0.001
			},
		})
	})

	return layer
}
