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

由于 3D 开发的复杂性，我们没有在 AbstractLayer 中规定要使用什么 3D 框架和引擎，而只是抽象地定义了 Layer 的生命周期以及作为一个地理数据组件的空间属性。而作为根节点的 Polaris 实例则可以使用多种 3D 框架和渲染器、多种渲染等级来渲染整个 Layer 树。

出于简化，Polaris App 工程目前全部使用 GSI + three.js 的方案作为 3D 开发框架。因此 Polaris 实例使用 基于公版 three.js 的 [PolarisThree](https://github.com/alibaba/spatial-data-vis-framework/blob/dev/packages/polaris/polaris-three/src/index.ts)，Layer 全部继承使用 GSI 和 three 定义场景树的 [`StandardLayer`](https://github.com/alibaba/spatial-data-vis-framework/blob/dev/packages/core/gsi/src/layer/StandardLayer.ts)。

## Layer 基类接口

### projection

### timeline

### view

### 生命周期

## 实现一种新的 Layer

### 派生类

### 工厂函数

## 在 Polaris App 工程中管理 Layer

## 在 Polaris App 工程中编写 Layer 代码

### Prop 描述

### 工厂函数

## Layer 中的 2D 开发

### HTML 接口

### 2D 元素的 3D 对位

## Layer 中的 3D 开发

### 基于 GSI 的 3D 开发

### 基于 three.js 的 3D 开发
