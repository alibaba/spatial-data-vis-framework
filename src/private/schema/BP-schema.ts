/**
 *
 * Better Polaris
 * 3D低代码协议
 * 描述一个3D场景的组件树和组建配置
 *
 * 应参考阿里2d低代码协议 https://lowcode-engine.cn/lowcode
 * 尽可能使用其“组件映射关系”部分的标准和出码工具，但是无法使用“组件树描述”部分
 * 因为该部分出码目标为 React/JSX/CSS
 * 需要添加props描述，用于生成gui setter
 *
 * 另外，由于无法使用该引擎的 designer，也无法和生态互通，遵循其标准的意义不大。
 *
 * @成分
 * - 配置描述 Descriptions
 *     - 应用配置描述
 *     - 官方组件配置描述
 *     - 自定义组件配置描述
 * - 配置结果 Props
 * 	   - 每个实例的配置项
 * - 资源列表 Assets
 * 	   - 静态资源列表 StaticAssets
 * 	   - 自定义组件 Layers Scripts Scenes
 *
 * @非静态资产
 * 用户创建的资产，需要区分静态资产和非静态资产：
 * - 静态资产
 *     - 模型、图片、json、视频等
 *     - 通过 AssetsManager 读取
 *     - 包含在最终打包成果中
 * - 非静态资产
 *     - 用户创建的代码
 *     - 通过 import require 读取
 *     - 不包含在最终打包结果中，而是打包成代码
 *     - 但是作为项目的一部分，需要保存在 assets 中，无法全部放在配置文件中
 *     - 展示上，与静态资产放在一起，blender那种分类管理并不好用
 *
 * 非静态资产只能通过“创建工具”创建，无法手工创建自动识别（遥远的将来也许可以）。
 * 其中 layer 是多文件资产，应该用固定结构的文件夹保存。
 */

import type { SceneBase } from "../base/SceneBase"
import type { ExternalComponent } from "./dep"

type Version = "0.0.1"

/**
 * Layer 定义，仅表明如何获取工厂函数，不包含实现
 *
 * @todo: 代码怎么保存？保存在 assets 里吗？
 *
 * @assume 把Layer和script和普通
 */
interface Layer {
	/**
	 * 必须唯一
	 */
	name: string
}

interface OfficialLayer extends ExternalComponent, Layer {}
interface CustomLayer extends Layer {
	/**
	 * 入口文件，指向 assets 中的 ts
	 */
	main: string
}

/**
 * Layer 实例
 * 包括 props 配置结果
 */
interface LayerInstance {}

interface Scene extends SceneBase {
	scripts: string[]
}

interface Stage {}

interface AssetObject {}

interface Assets {}
interface Scripts {}
interface LayerInstances {} // 包括 props 配置结果
interface Scenes {}
interface Stages {}
interface App {} // 顶层配置结果

/**
 * 成分
 */

export interface Schema {
	version: Version
}
