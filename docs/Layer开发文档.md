# Layer 开发文档

本文档将介绍开发 Layer 类的流程。

> 🌟 本文档仅适用于进阶开发者

> 🌟 如果要开发包含 3D 场景的 Layer，你必须拥有 3D 开发的知识和经验，本文档不适合作为 3D 开发的入门文档

在开始之前，你应该先阅读并理解一下文档：

-   [Polaris App 核心概念](./核心概念.md)
-   [Polaris App 顶层 API](./顶层API.md)

并参照 [README](../README.md) 创建了自己的 Polaris App 工程项目。

## 什么是 Layer

正如[《核心概念》](./核心概念.md#Layer)中所介绍的：

> Layer 是 PolarisGL 框架的核心概念，代表一个**可复用的功能单元**，通常包括视觉元素、交互行为或存粹的功能逻> 辑。
>
> > 🔔 可类比 react 的 component 或 UE4 的 actor。
>
> 实例化 Layer 并添加到 Polaris 实例上，即得到一个包含特定功能的可视化应用。

一个 PolarisGL 应用，是一颗 Layer 树：

```
一个在地图上显示人口热力图的应用
  ├── 地图组件
  │     ├── 城市地图
  |     |     ├── 建筑
  |     |     └── 道路
  │     ├── 行政边界
  │     └── 地形地质
  └── 数据展示组件
        ├── 人口热力图
        └── 经济柱状图

对应的内部结构是：

polaris （选择渲染器、渲染效果、相机参数等）
  ├── 地图Layer
  │     ├── 城市地图Layer
  |     |     ├── 建筑Layer
  |     |     └── 道路Layer
  │     ├── 行政边界Layer
  │     └── 地形地质Layer
  └── 数据展示Layer
        ├── 人口热力图Layer
        └── 经济柱状图Layer
```

其中：

polaris 继承自 [`PolarisGSI`](https://github.com/alibaba/spatial-data-vis-framework/blob/dev/packages/core/gsi/src/polaris/PolarisGSI.ts) > [`AbstractPolaris`](https://github.com/alibaba/spatial-data-vis-framework/blob/dev/packages/core/base/src/Polaris.ts) > [`AbstractLayer`](https://github.com/alibaba/spatial-data-vis-framework/blob/dev/packages/core/base/src/Layer.ts)，是一种特殊的 Layer，作为整个 Layer 树的根节点。包含渲染整个子树的渲染器，并管理所有事件、相机、生命周期。

所有 Layer 都继承自 [`StandardLayer`](https://github.com/alibaba/spatial-data-vis-framework/blob/dev/packages/core/gsi/src/layer/StandardLayer.ts) > [`AbstractLayer`](https://github.com/alibaba/spatial-data-vis-framework/blob/dev/packages/core/base/src/Layer.ts)。

因此，树上的所有节点都继承自 [`AbstractLayer`](https://github.com/alibaba/spatial-data-vis-framework/blob/dev/packages/core/base/src/Layer.ts) > [`Node`](https://github.com/alibaba/spatial-data-vis-framework/blob/dev/packages/core/base/src/Node.ts) > [`EventDispatcher`](https://github.com/alibaba/spatial-data-vis-framework/blob/dev/packages/core/base/src/EventDispatcher.ts)。

PolarisGL 出于对 3D 引擎的包容性和对可复用性的最大化追求，没有在 AbstractLayer 中规定要使用哪种 3D 框架，而只是抽象地定义了 Layer 的生命周期以及作为一个地理数据组件的空间属性。而作为根节点的 Polaris 实例则可以使用多种 3D 框架和渲染器、多种渲染等级来渲染整个 Layer 树。

Polaris App 出于简化，规定使用 GSI + three.js 的方案作为 3D 开发框架。因此 Polaris 实例使用 [PolarisThree](https://github.com/alibaba/spatial-data-vis-framework/blob/dev/packages/polaris/polaris-three/src/index.ts)（基于公版 three.js），Layer 全部继承 [`StandardLayer`](https://github.com/alibaba/spatial-data-vis-framework/blob/dev/packages/core/gsi/src/layer/StandardLayer.ts)（使用 GSI 和 three 定义场景树）。

Polaris App 屏蔽掉了 Polaris 和渲染器的细节、Layer 的创建和管理，因此开发者只需要在 Layer 模版的基础上修改 Layer 。

> ✨ Polaris App 的好处是，你不需要关注 `src/layers/你的Layer` 以外的任何代码，因此本文档不涉及 PolarisThree 的用法。

## Layer 基类接口

首先了解 StandardLayer 基类的主要接口，实现其接口的对象都可以作为 layer 添加到 layer 树上。

```typescript
import { StandardLayer } from '@polaris.gl/gsi'
```

### 作为 EventDispatcher

Layer 继承自 [`EventDispatcher`](https://github.com/alibaba/spatial-data-vis-framework/blob/dev/packages/core/base/src/EventDispatcher.ts)，该类接口与 DOM EventDispatcher 相似，增加了严格的 typescript 类型检查。

```typescript
const layer = new StandardLayer()
layer.addEventListener('aaa', (e) => console.log('got aaa', e))
layer.dispatchEvent({ type: 'aaa', otherData: 123 })
```

### 作为 树

Layer 继承自 [`Node`](https://github.com/alibaba/spatial-data-vis-framework/blob/dev/packages/core/base/src/Node.ts)，是一个事件驱动的树状数据结构。

```typescript
const a = new StandardLayer()

const b = new StandardLayer()
b.addEventListener('add', (e) => console.log(e))
b.addEventListener('remove', (e) => console.log(e))
b.addEventListener('rootChange', (e) => console.log(e))

b.add(a)

b.remove(a)
```

### projection

PolarisGL 是用户可视化空间数据的框架，所有数据源要么是经纬度坐标，要么也能映射的经纬度坐标上。（我们用 `lng` 代指经度，`lat` 代指维度，`lat` 代指海拔）

然而 3D 渲染使用的笛卡尔坐标（即直角坐标系中的三维坐标 `vec3(x,y,z)` ）。

经纬度坐标和笛卡尔坐标之间的映射关系称为 `地理投影` Geo Projection , 其中 `LngLatAlt` 到 `xyz` 的转换称为 `project` 投影，反过来称为 `unproject` 逆投影。

有许多开源项目的 GIS 软件中都有丰富的投影算法和介绍，可以自行了解。

> GIS 软件中介绍的投影往往是 2D 的 `LngLat` -> `xy`，将 alt 和 z 默认视为 0 即可，通常从额外的数据源（例如高程或地形数据中）获取高度作为 z。

3D 建模软件和渲染引擎中的 3D 坐标系也各有不同，PolarisGL 作为空间数据框架，对 3D 坐标（投影的结果）作如下规范：

-   x 轴朝向 东方，单位为 米
-   y 轴朝向 北方，单位为 米
-   z 轴朝向 天空（平面投影超上，球面投影从球心朝外），单位为 米

该方案最贴近地理数据的习惯，x/y/z 与 经度/纬度/海拔 三个值的方向一一对应。

> 在和其他软件交互时，可能要绕 x 旋转或反转 y。

PolarisGL 中提供了一套常用的 projection 类，作为 layer 的核心接口，用于处理 layer 中的数据，也用于将不同 projection 的 layer 在地图中合理对齐。如有需要，也可以集成 Projection 基类，实现自己的 project 和 unproject 接口，得到新的投影类型。

#### 指定 layer 的 projection

可以在 Layer 构造参数中传入 projection 实例来指定该 layer 实例的投影，也可以在 Layer 构造函数中创建好 projection，作为构造参数传给 super，来指定自己的投影。

使用什么投影往往有明确的业务和功能需求，例如：

-   画在地球上的数据要使用地心投影或者球面投影
-   一些国家要求自己的地图只能使用特定投影
-   高纬度地区要使用等角或者等距投影来避免变形

如果没有规定投影，layer 将会沿着 layer 树向上寻找有投影的 layer，直到找到一个投影，或者到达根节点。

polaris 作为根节点，默认使用 以 本初子午线和赤道为中心的 web 墨卡托投影。

#### layer 投影的 resolve 规则

如果 Layer 在构造阶段指定了投影，则可以直接使用，但是通用的 layer 往往不会将 投影写死，创建过多的 projection 对象也会造成性能问题。一个应用通常只使用一种或两种统一的投影，一个复合功能 layer 往往包含许多 layer 构成的子树来实现自己的所有功能，所有 layer 也自然要共用同一个投影对象。

因此 layer 的投影应该通过生命周期时间获得，实际得到的投影由 layer 树的结构决定：

如果没有规定投影，layer 将会沿着 layer 树向上寻找有投影的 layer，直到找到一个投影，或者到达根节点。

建议通过 layer 的 InitEvent 获取投影。

#### 多种投影的自动对齐机制

PolarisGL 原生支持多中心/多类型投影的自动对齐，每个 layer 可以选择最适合自己的投影，Polaris 会根据用户视角来对齐视觉中心。并且用合理的相切关系来对齐 球面 和 平面 投影。

详见 [coordinator](https://github.com/alibaba/spatial-data-vis-framework/tree/dev/packages/core/coordinator)

### timeline

Timeline 是 PolarisGL 中所有动画和时间相关行为的基础，使用 Track 时间轨道 来规划和管理所有时间相关的行为，包括渲染动作、动画、交互等。

详见 [timeline](https://github.com/alibaba/timeline)

### view

Polaris GL 的 Layer 提供的视觉元素放在自己的 view 中，view 可以自定义扩展。

Polaris App 中，出于简化，提供了以下固定 view:

-   `layer.element`
    -   HTML DIV ELEMENT, 所有挂载该元素下的元素随 layer 一起展示
-   `layer.group`
    -   GSI Node，所有用 GSI 定义的 3D 场景放在该对象中，随 layer 一起展示
-   `layer.threeRef` `@TODO`
    -   THREE.Group，所有用 THREE 定义的 3D 场景放在该对象中，随 layer 一起展示

### 生命周期

请仔细阅读 `生命周期` 和 `生命周期事件` 的 [‼️ 重要文档 ‼️](https://github.com/alibaba/spatial-data-vis-framework/blob/dev/packages/core/base/src/events.ts) 这些生命周期事件是整个 Polaris GL 运转的关键。

## 实现一种新的 Layer

如上所说，polaris GL 应用是一颗 layer 对象树。要实现一种新的 Layer，可以选择继承 StandardLayer 实现一个新的 Layer 类，也可以选择实例化一个空的 StandardLayer，然后通过其丰富的生命周期来向上面添加所有的功能。

Polaris App 工程中，推荐使用后者。

### 派生类

```typescript
class MyLayer extends StandardLayer {
    constructor(props: any) {
        super(props)

        do_something_here()

        this.addEventListener('init', (e) => {
            and_something_here()
        })

        this.addEventListener('dispose', (e) => {
            do_some_cleaning()
        })
    }

    myMethod() {}
}

const l = new MyLayer()

polaris.add(l)
```

改写法符合面向对象的常规逻辑，但是 PolarisGL 和 Polaris App 都是基于事件的系统，多数行为都发生在生命周期相关的事件回调中，而不是同步地发生在 constructor 中，我们也不鼓励为 layer 添加自定义的 method。

因此在 Polaris App 中，我们创建的 layer 模版使用函数化风格。

### 基于生命周期的工厂函数

```typescript
function createMyLayer(props: any) {
    const layer = new StandardLayer(props)

    do_something_here()

    layer.addEventListener('init', (e) => {
        and_something_here()
    })

    layer.addEventListener('dispose', (e) => {
        do_some_cleaning()
    })

    return layer
}

const l = createMyLayer()

polaris.add(l)
```

## 在 Polaris App 工程中开发 Layer

Polaris App 的工程脚手架会帮你自动化管理和引入 Layer 类，并且规定了 描述 Props （Layer）

### 从模版新建 Layer

Polaris App 脚手架提供了快速创建 layer 模版的功能。GUI 中有对应的按钮，也可以通过命令行来使用。

#### Add New Layer Classes

```bash
node scripts/layer.mjs add {LayerClassName} # Upper Camel Case ending with `Layer`
```

The new Layer Class (factory-pattern template code) will be added to `src/layers/{LayerClassName}/index.ts`.

#### Remove Layer Classes

```bash
node scripts/layer.mjs remove {LayerClassName}
```

### 编写 Prop 描述

请参考模版编写 Props 的描述，该描述将用于：

-   生成正确的 ts 接口
-   运行时入参检查
-   规定变化时的响应方案
-   生成 GUI 面板

[接口文档](../src/private/schema/meta.ts)

### 编写工厂函数

参考生成的模版、demo layer、上述的 `基于生命周期的工厂函数`，以及 详细的生命周期文档。

### 响应 Props 变化

PolarisGL 中使用 prop manager 来做脏检查，layer 用户通过 setProps 来更新 props, layer 内通过 watchProps 来监听 props 变化并做出精确响应。

该方案的开发成本比较高，响应的逻辑容易出错，也容易有时序问题。

Polaris App 中，我们增加了一种更简单的函数化方案：

Polaris App 中所有 Layer 的 props 都由 AppConfig 提供，通过 `app.configManager.setConfig()` 来更新 layer 的 props.

在 props desc 中有一个 mutable 字段，默认为 false，当 Polaris App 发现一个 non-mutable 的 props 发生变化时，会 dispose 掉老的 layer 实例，重新运行工厂函数，替换为一个新的 layer 实例。使用这种方案来保证响应结果的正确性。由于 props 的变化主要发生在 `搭建与调参` 环节，这种性能上的损耗通常是可以接受的。

但如果改变化需要发生在运行环节，或者重建 Layer 的性能成本实在太高，你有两个途径来优化这种性能：

-   Plan A: 使用函数式编程的思路，对昂贵步骤进行缓存

可以参照 react hooks，使用 memorize 包装昂贵步骤，每次重新调用时检查是否需要重新计算。

-   Plan B: 将 props 的 mutable 字段设置为 true，这样 Polaris App 将不会 dispose 掉老的 layer 实例，而是直接调用 layer 的 `setProps` 方法来更新 props.

使用这种方法的话，你需要通过 `watchProps`/`watchProp` 来监听 props 的变化，自行响应。

### 接入实时数据

Polaris App 建议使用 DataStub 由外部传入数据。详见 [《DataStub 数据源/数据插槽》](./核心概念.md).

当然你可以直接在 layer 生命周期中自行取数。或者直接调用 setProps 来更新数据。这些做法将无法从 Polaris App 的结构和工具中受益。

## Layer 中的 2D 开发

### HTML 接口

### 2D 元素的 3D 空间对位

## Layer 中的 3D 开发

### 基于 GSI 的 3D 开发

### 基于 three.js 的 3D 开发
