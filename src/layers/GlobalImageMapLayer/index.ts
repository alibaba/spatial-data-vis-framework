/**
 * GlobalImageMapLayer
 */
import { Mesh, UnlitMaterial } from '@gs.i/frontend-sdk'
import { specifyTexture } from '@gs.i/utils-specify'

import { StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'
import { EquirectangularProjection } from '@polaris.gl/projection'

import type { PropDescription } from '../../private/schema/meta'
import {
	DescToParsedType,
	DescToType,
	DescToTypeMutable,
	parseProps,
} from '../../private/utils/props'
import { genFlatEarthSurface } from './genEarthSurface'
import { reArrange } from './reArrange'
import { reProject } from './reProject'

export const info = {
	name: 'Global Image Map',
	description: 'Draw global map with a image. Used for geo-referencing.',
	category: 'Internal',
}

/**
 * 详见 @see {@link [PropDescription](../../private/schema/meta.ts)}
 *
 * Props Description. Used to:
 * - generate default props.
 * - check props type and range.
 * - generate the props editor UI.
 */
export const propsDesc = [
	{
		name: 'Map',
		key: 'map',
		type: 'string',
		defaultValue:
			'https://img.alicdn.com/imgextra/i4/O1CN01RhlekZ23c0Dr1pDtW_!!6000000007275-0-tps-4096-2048.jpg',
		// 'https://img.alicdn.com/imgextra/i1/O1CN01gHSiCw1R54Lb3B9Tx_!!6000000002059-0-tps-4096-2048.jpg',
	},
	{
		name: 'PDC',
		key: 'pdc',
		info: 'Pacific Ocean as Center',
		type: 'boolean',
		defaultValue: false,
	},
	{
		name: 'opacity',
		key: 'opacity',
		type: 'number',
		defaultValue: 1,
		range: { min: 0, max: 1 },
		mutable: true,
	},
	{
		key: 'offset',
		name: '位置偏移',
		type: 'vec3',
		defaultValue: { x: 0, y: 0, z: -1000 },
		mutable: true,
	},
] as const

// @note type check. will be removed when compile.
propsDesc as readonly PropDescription[]

/**
 * GlobalImageMapLayer Props
 */
type GlobalImageMapLayerProps = DescToType<typeof propsDesc>
type GlobalImageMapLayerMutableProps = DescToTypeMutable<typeof propsDesc>

/**
 * factory function for GlobalImageMapLayer
 *
 * @description 工厂函数模式说明
 *
 * @note 函数式编程
 * - propsDesc 中的所有属性，没有指明 mutable 的，默认都为 immutable
 * - immutable 属性变化，会销毁Layer，然后用全新的 props 重新执行工厂函数
 * - 工厂函数无状态，但是可以通过闭包自行缓存一些计算
 *
 * @legacy 兼容经典的监听模式
 * - 如果希望某个属性可以运行时频繁变化
 * - - propsDesc 中将其标为 `mutable: true`
 * - - 通过 `layer.watchProps()` / `layer.watchProp()` 监听变化并响应
 */
export function createGlobalImageMapLayer(props: GlobalImageMapLayerProps) {
	console.log('createGlobalImageMapLayer')

	// 补全缺省值，并检查必要性、类型和值范围
	const parsedProps = parseProps(props, propsDesc)

	const layer = new StandardLayer<StandardLayerProps & GlobalImageMapLayerMutableProps>({
		name: 'GlobalImageMapLayer',
		...parsedProps,
	})

	layer.addEventListener('init', async (e) => {
		const { projection, timeline, polaris } = e

		if (!parsedProps.map) return

		// 生成一个铺满经纬度的平面
		// 这里使用的 投影 要和 图片中的投影一致，全球地图图片通常使用矩形投影
		const eqPro = new EquirectangularProjection({})
		const geom = genFlatEarthSurface(eqPro, -180, 360, -90, 180, 10, 20)

		// 重新投影到当前的地理投影中
		reProject(geom, eqPro, projection)

		// 如果有需要，将太平洋置于中心
		if (parsedProps.pdc) reArrange(geom, projection)

		// 创建材质，uv 已经按照经纬度算好，直接贴图即可
		const matr = new UnlitMaterial({
			alphaMode: 'BLEND',
			baseColorTexture: specifyTexture({
				// 如果原图是 sRGB 空间，则需要明确指定，否则会造成色偏
				image: { uri: parsedProps.map, extensions: { EXT_image_encoding: 'SRGB' } },
				// 适用于 PDC 偏移
				sampler: { wrapS: 'REPEAT', wrapT: 'REPEAT' },
			}),
		})

		// GSI renderable node
		const mesh = new Mesh({
			geometry: geom,
			material: matr,
		})

		layer.useProp('offset', (e) => {
			const offset = e.props.offset
			mesh.transform.position.set(offset.x, offset.y, offset.z)
		})

		layer.useProp('opacity', (e) => {
			const opacity = e.props.opacity
			matr.opacity = opacity
		})

		layer.group.add(mesh)
	})

	return layer
}
