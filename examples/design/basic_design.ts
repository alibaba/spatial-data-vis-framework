/* eslint-disable @typescript-eslint/no-unused-vars */
import { Layer } from '@polaris.gl/core-layer'

class Polaris extends Layer {
	constructor(p: any) {
		super(p)
	}
}
class PolarisConductor extends Polaris {}

class PolarisLite extends Layer {}
class PolarisHD extends Layer {}

class ViewLayer extends Layer {}
class RenderableLayer extends Layer {}
class HtmlLayer extends Layer {}

class Renderer {
	render(p: any) {}
}
class ThreeLiteRenderer extends Renderer {}
class HDRenderer extends Renderer {}
class RendererLayer extends Layer {
	constructor(p: any) {
		super(p)
	}
}

class View {}
class HtmlView extends View {}
class ThreeView extends View {}
class RenderableView extends View {}

// 当前 (view 合并在 layer 中， renderer 合并在 Polaris 中)
{
	class MapLayer extends ViewLayer {}

	const p = new PolarisLite({})
	const layer = new MapLayer({ parent: p })

	// 跨 Polaris/renderer 合作
	{
		const p = new PolarisConductor({})
		// 需要提前关掉 slaves 的控制能力，负责可能会有问题
		const p1 = new PolarisLite({ parent: p })
		const p2 = new PolarisHD({ parent: p })
	}
}

// view 从 layer 中分离，renderer 从 Polaris 中分离
{
	class MapLayer extends Layer {
		view = { three: new ThreeView() }
	}

	const p = new Polaris({ renderer: new ThreeLiteRenderer() })
	const layerA = new MapLayer({ parent: p })

	// 跨 Polaris/renderer 合作
	{
		const p = new PolarisConductor({})
		// 需要提前关掉 slaves 的控制能力，负责可能会有问题
		const p1 = new Polaris({ parent: p, renderer: new ThreeLiteRenderer() })
		const p2 = new Polaris({ parent: p, renderer: new HDRenderer() })
	}
}

// 子树渲染
// 分离 Polaris 渲染逻辑 到一个 layer 中，获得天然的 跨 renderer 能力
// 但是并没有解决 跨 polaris 合作，限制微服务能力
{
	class MapLayer extends Layer {
		view = new ThreeView()
		// constructor (){
		// 	this.view.three.group.add(mesh)
		// }
	}

	const p = new Polaris({})

	const rendererLayer1 = new RendererLayer({ parent: p, renderer: new ThreeLiteRenderer() })
	const rendererLayer2 = new RendererLayer({ parent: p, renderer: new HDRenderer() })

	const layerA = new MapLayer({ parent: rendererLayer1 })
}

// 渲染分离
// 这个实现似乎有很多难度
// 先不考虑
{
	class MapLayer extends Layer {
		view = new ThreeView()
	}

	const p = new Polaris({})
	const layerA = new Layer({ parent: p })
	const layerB = new MapLayer({ parent: layerA })

	const renderer = new ThreeLiteRenderer()
	renderer.render(p)
}

/**
 * @summary
 * 所有架构中，从 低级到高级 似乎是相互兼容的
 *
 * @子树渲染
 * Renderlayer 渲染自己的子树，顶层 Polaris 不负责渲染
 * class RenderLayer extends Layer {}
 * class Polaris extends RenderLayer {}
 * const p = new Polaris({ renderer: null }) // 不应该有复合 renderer，但似乎也不会有什么问题？
 * const r = new RendererLayer({ parent: p, renderer: new ThreeLiteRenderer() })
 *
 * @view分离
 * 实现子树渲染后，就能实现 view 分离，相当于只有一颗子树的情况
 * class Polaris extends RendererLayer {}
 * const polaris = new Polaris({ renderer: new ThreeLiteRenderer() })
 *
 * @view内置
 * 实现 view 分离后，就能实现内置 view，相当于选定特定渲染器的情况
 * class PolarisLite extends RendererLayer {
 *      renderer = new ThreeLiteRenderer()
 * }
 * const polarisLite = new PolarisLite()
 *
 * @于是
 * 因此很自然的决定是：实现子树渲染，保持最大可扩展性；但是封装成更高层级给人用
 *
 * @那么
 * 推荐使用那个层级呢？
 * - 使用 @内置view 有什么问题吗？
 *      所有的 Layer 都会带上 view 的依赖
 *      如果不允许离散 view，这好像也没有什么问题
 */

/**
 * @离散view
 *
 * 希望在运行时动态处理一颗离散view树，有什么问题？
 * 回到问题的本质，其实是，到底要如何处理
 * - 坐标对其的问题
 * - visibility 继承
 */
