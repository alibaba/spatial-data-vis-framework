# Polaris App Usage

这里假设你已经有一个开发好、打包好的 `Polaris App`，包含一个 `App.mjs` 文件和若干个 `config.json` 文件。本文介绍如何使用。

## 引入

Polaris App 的打包系统提供 ESM 标准的 `.mjs` 文件，使用较新的语法特性，包含所有外部依赖。

在现代浏览器中，可以用原生 import 动态引入，方便快捷，无需转译、打包、polyfill 等：

```html
<script type="module">
	const { App } = await import('REMOTE_PATH_TO/App.mjs')
</script>
```

如果你的应用使用 webpack 进行打包，可以要求 webpack 使用原生 import：

```js
const { App } = await import(/* webpackIgnore: true */ 'REMOTE_PATH_TO/App.mjs')
```

你也可以将 App.mjs 放入你的项目代码库中，或者发布成 npm 包，通过你的打包系统引入到你的最终应用中，以此来添加 polyfill。

```js
// as npm
import { App } from 'YOUR_NPM_PACKAGE_NAME'
// as local file
import { App } from '../bin/App.mjs'
```

## 实例化与销毁

```js
const app = new App({
	container: document.getElementById('container'),
	config: {
		// initial app config json
	},
})
```

```js
app.dispose()
```

## 切换场景

`场景(scene)`是 Polaris App 的核心概念，一个 Polaris App 可以包含多个场景，每个场景控制其开启的 Layer 实例和相机状态。

可用的场景配置在 config 的 `scenes` 字段中:

```js
// config
{
    scenes: [
        // LOCAL_SCENE_DEFAULT 是 config 中必须包含的默认场景
        {id: 'LOCAL_SCENE_DEFAULT', name: 'Default Scene', ...},
        {id: 'LOCAL_SCENE_2', name: 'Scene 2', ...},
    ]
}

app.changeScene('LOCAL_SCENE_2')
```

初始化 PolarisApp 后切换到`初始化场景`，配置在 `config.app.initialScene` 中。
若未设置，将使用 `'LOCAL_SCENE_DEFAULT'` 作为初始化场景。

## 配置管理

### 获取当前配置

```js
const currentConfig = app.configManager.getConfig()
```

> **注意 ⚠️**
> 返回的 config 应被视为 readonly，修改这个对象的任何部分都可能会破坏之后的脏检查。

### 更新配置

实例化 PolarisApp 后，你可以修改 app config，PolarisApp 会对比新老 config （脏检查），并作出必要的更新。

```js
app.configManager.setConfig(newConfig)
```

#### 注意 ⚠️

构造函数和 setConfig 传入的 config 对象都应该被视为 `immutable`，即:

- 传入后，不可再原地修改其中的值或者引用
- 你可以复用其中未变的子树，但是变化的部分应该同时更新所有父节点

该要求与 react 和 vue 相似. 你也可以使用 `immutable.js` 或者 `immer.js` 来管理 config 对象。

```js
// ❌ bad, 会导致脏检查失效
const config = app.configManager.getConfig()
config.app.debug = true
app.configManager.setConfig(config)

// ✅ good
const config = app.configManager.getConfig()
const newConfig = {
    ...config,
    app: {
        ...config.app,
        debug: true,
    },
}
app.configManager.setConfig(newConfig)

// ✅ good, 使用 immutable 类库管理 config 对象
import { produce } from 'immer'
const config = app.configManager.getConfig()
const newConfig = produce(config, draft => {
    draft.app.debug = true
})
app.configManager.setConfig(newConfig)

// ✅ good, 使用 structuredClone 会造成性能损失，但可保证结果正确
const config = app.configManager.getConfig()
const newConfig = structuredClone(config)
newConfig.app.debug = true
app.configManager.setConfig(newConfig)
```

#### 使用原则

**PolarisApp 保证响应 config 的任何变化，尽最大努力得到正确的结果。但不保证该过程的性能和时效。**

实现上，PolarisApp 为了响应配置变化，默认会重建所有受影响的对象，需要开发者主动标出可以复用的资源和计算过程。

- 你**可以**假设 PolarisApp 可以响应任何 config 修改，包括整个场景的重建
- 你**应该**假设每次 setConfig 都会很慢，包含许多冗余计算和内存溢出，并且包含异步流程。

我们建议：

- setConfig 只应出现在开发和设计阶段，而非生产环境运行时（除非你确信该操作足够高效）。
- 永远不要用 setConfig 来做动画.
- 如果 config 彻底修改，建议销毁掉 PolarisApp 实例，重新实例化。

## 数据接入

Polaris App 使用 `“数据插槽” (DataStub)` 的概念来接入数据。

App Config 的 `dataStubs` 字段中配置了所有数据插槽及其初始值，`layers` 配置中会将这些数据插槽绑定到 layer prop 上。

数据的提供和使用完全隔离。对于 PolarisApp 的使用者来说，不需要关心每个数据如何使用、被谁使用、有没有使用，只需要关心为每个插槽灌入数据。

```js
{
    dataStubs: [
        {
            id: 'LOCAL_DATA_0',
            name: '全球热力点数据',
            initialValue: null, // 初始值
        },
    ],
}
```

### 动态数据

对于会频繁更新的数据，可以多次调用 `updateDataStub`:

```js
setInterval(async () => {
	const dynamicData = await fetchDynamicData()
	app.updateDataStub('LOCAL_DATA_0', dynamicData)
}, 1000)
```

### 静态数据

对于不会更新的数据，你可以直接作为 `initialValue` 配置到数据插槽中。

如果担心该字段导致 config 体积过大，也可以将 `initialValue` 设为 null，实例化后调用一次 `updateDataStub` 来传入数据：

```js
app.updateDataStub('LOCAL_DATA_0', staticData)
```

### 注意

初始化数据和每次 updateDataStub 传入的数据都会直接交给数据的使用者（通常是 layer），PolarisApp 不会做额外处理和过滤，数据变化、传入 null/undefined 等特殊值的影响完全由使用者自行处理。

所有传入的数据都应视为 readonly，不得再修改。

## 事件系统

PolarisApp 通过事件系统与外部应用进行高级交互。每个 PolarisApp 实例包含一个事件总线，通过 `getEventBusAgent` 来获取事件总线的代理。

```js
// `me` 代表该代理的使用者
// 用来告知事件的接收方，这个事件是谁触发的（`event.target`）
// 如果不触发事件，或者不需要这个信息，可以传入 null
const eventBus = app.getEventBusAgent(me)
```

目前所有事件都在总线上广播，在 PolarisApp 实例范围内是全局可见的。

### 事件格式

```typescript
interface EventBase {
	/**
	 * 事件类型（事件名）
	 */
	type: string

	/**
	 * 事件触发者的引用
	 */
	target: any

	/**
	 * 事件监听器挂载的对象应用
	 */
	currentTarget: any

	/**
	 * 每种事件可规定其他专用字段
	 */
	[key: string]: any
}
```

### 事件类型

事件分为“内部事件”（`internal event`）和“自定义事件”（`custom event`）.

内部事件代表 PolarisApp 的标准行为，target 都是 PolarisApp 实例，目前包括:

- tick
  - 每帧 render 前的某个时刻
- afterInit
  - 实例构造完成后
- dispose
- beforeSceneChange
  - 场景切换前，用于拦截切换效果
  - 包括初始化场景切换
- afterSceneChange
  - 场景切换后
  - 包括初始化场景切换
- beforeUpdateData
  - 数据输入后，传给数据使用者前，用于拦截数据并修改
  - ？是否处理初始化数据？

自定义事件是用户自己规定、自己触发的，可以用来实现自定义交互。事件名以 `$` 开头（暂定），例如 `$custom:foo`。

- $xxx
  - 自定义事件，可以由 Layer、脚本、或 PolarisApp 的使用者 自由触发
  - 需要与内置事件隔离，避免用户触发内部事件，（校验 $ 前缀）
  - target: 触发事件的脚本所挂载的对象 / 触发事件的 Layer / 触发事件的外部应用
  - currentTarget: 监听事件的脚本挂载的对象 / 监听事件的 Layer / 监听事件的外部应用

### 事件监听

```js
eventBus.on('afterInit', (event) => {
	console.log('app init-ed', event)
})

eventBus.on('tick', (event) => {
	console.log('app tick', event)
})

eventBus.on('$custom:foo', (event) => {
	console.log('$custom:foo', event)
})
```

### 事件触发

```js
eventBus.emit('$custom:bar', { bar: 123 })
```

### 注意 ⚠️

- 为了避免用户触发内部事件，自定义事件名必须以 `$` 开头（暂定）
- `EventBusAgent.emit` 只能触发自定义事件，否则将直接抛错
- 事件总线是发布/订阅模式
  - 发布者并不知道事件被谁接收、是否被接收
  - 事件可以被多个监听者接收
  - 不应该假设接收的先后顺序，不应该假设接收行为是同步的
  - 事件总线不会记录事件，因此监听者必须在事件触发前订阅，不然会错过
