/**
 * TLayer
 */
import { specifyNode } from '@gs.i/utils-specify'

import { StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'

// three 的场景树元素和插件基本都可以使用，注意引入时避免破坏脏检查
import { BoxGeometry, Color, Group, Mesh, MeshStandardMaterial, PointLight } from 'three'

import type { PropDescription } from '../../private/schema/meta'
import {
	DescToParsedType,
	DescToType,
	DescToTypeMutable,
	parseProps,
} from '../../private/utils/props'

export const info = {
	name: '',
	description: '',
	category: 'Unknown',
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
	// example: mutable prop
	{
		key: 'objectColor',
		name: 'objectColor',
		type: 'color',
		defaultValue: '#ffffff',
		mutable: true,
	},
	// example: immutable prop
	{
		name: 'lightColor',
		key: 'lightColor',
		type: 'color',
		defaultValue: '#ff0000',
	},
] as const

// @note type check. will be removed when compile.
propsDesc as readonly PropDescription[]

/**
 * TLayer Props
 */
type TLayerProps = DescToType<typeof propsDesc>
type TLayerMutableProps = DescToTypeMutable<typeof propsDesc>

/**
 * factory function for TLayer
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
export function createTLayer(props: TLayerProps) {
	console.log('createTLayer')

	// 补全缺省值，并检查必要性、类型和值范围
	const parsedProps = parseProps(props, propsDesc)

	const layer = new StandardLayer<StandardLayerProps & TLayerMutableProps>({
		name: 'TLayer',
		...parsedProps,
	})

	/**
	 * three 内容全部放该 group 下
	 *
	 * 该部分将 bypass GSI 的转换逻辑，直接放在最终的 three 场景树中，由 PolarisThree 创建 THREE.WebGLRenderer 渲染
	 *
	 * ## 🌞 💐 🪐 `three in GSI` 使用说明 👈
	 *
	 * @experimental 实验特性，请关注后续更新
	 *
	 * @note 仅部分 Polaris 版本支持该特性
	 * @note 如果依赖特定的 three 版本，将导致无法向后兼容或在项目间迁移
	 *
	 * @note 修改 object3D 的 transform（position/rotation等）后，需要调用 threeGroup.updateMatrixWorld(true) 才会生效
	 * @note 不要用 Object3D.parent 或 updateWorldMatrix(true, true) 等接口读取或操作 threeGroup 以外的节点
	 * @note polaris 不管理 three对象的生命周期，请在 dispose 事件中使用 three 接口主动回收内存
	 *
	 */
	const threeGroup = new Group()

	// three object 放入 GSI 场景树
	layer.group.add(
		specifyNode({
			name: 'gsi-three-linker',
			extensions: { EXT_ref_threejs: threeGroup },
		})
	)

	layer.addEventListener('init', async (e) => {
		const { projection, timeline, polaris } = e

		const threeRenderer = polaris['renderer'].renderer

		const material = new MeshStandardMaterial()
		const geometry = new BoxGeometry(500, 500, 500)
		const mesh = new Mesh(geometry, material)

		threeGroup.add(mesh)

		layer.useProp('objectColor', (color) => {
			material.color.set(new Color(color as string))
		})

		const pointLight = new PointLight(new Color(parsedProps.lightColor as string), 1, 2000)
		pointLight.position.set(700, 700, 700)
		threeGroup.add(pointLight)

		layer.addEventListener('dispose', () => {
			threeGroup.remove(mesh)
			geometry.dispose()
			material.dispose()
			pointLight.dispose()
		})
	})

	return layer
}
