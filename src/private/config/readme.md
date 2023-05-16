# Polaris App Config toolkit

Config 的类型定义在 [../schema](../schema) 中，使用时应同时复制这两个文件夹。

## React 侧

- `actions.ts` 是为 react 环境实现的一套 reducer。

```typescript
import { configReducer } from './actions.ts'

// 在 function component 中使用
const [config, dispatch] = useReducer(configReducer, null)
```

其中 `config` 是用 `immer` 实现的 immutable value，只读，可以方便的通过浅对比来判断是否发生变化。

## PolarisApp 侧

如果你是 editor 开发者，你可能只关心 `ConfigManager` 的接口，而用不到这部分的代码

- `ConfigManager.ts` 是 PolarisApp 内部使用的，用于管理 config 状态，脏检查、响应 config 变化。
  - `EventDispatcher.ts` 是 ConfigManager 的 parent
  - `utils/*` 是工具函数

## 最佳实践

作为 editor 开发者，建议使用方法是：

- 使用 null 来初始化 reducer
- 获取到 初始 config 后，实例化 PolarisApp，并 dispatch 一个 `init` action 来同步
- 之后都通过 dispatch 来修改 config，每次修改后调用 `polarisApp.configManager.setConfig(config)` 来同步 polarisApp 内部的 config
- 如果你不能保证 config 是 immutable ，那么每次传入前应进行 structureClone 或等效操作

注意：

- configManager.getConfig 可以拿到完整的 config，应被视为 immutable，不要修改这个对象
- setConfig 传入新 config 的原则：
  - 传入的 config 应被视为 immutable（不能原地修改其中的值或者引用）
  - 不要求传入的 config 是全新的（可以重复使用其中没有变化的子树）
- 你可以假设 PolarisApp 可以响应任何 config 修改，包括整个场景的重建
- 你应该假设 setConfig 可能很慢，包含许多冗余计算，无法彻底的回收内存，并且可能是异步的。
  - 不可用 setConfig 来实现任何运行时动画效果
- 单向数据流
  - 你的 editor 生成、维护、修改 config，通过 setConfig 同步给 polarisApp，polarisApp 不会修改 config

## 实例代码

```typescript
import { useEffect, useReducer, useRef, useState } from 'react'

import { configReducer } from './actions.ts'

export default function Editor() {
	// PolarisApp 的类，可以通过 umd / esm 动态下载，也可以把代码拷贝到本地
	const [PolarisAppClass, setPolarisAppClass] = useState(null)
	// 获取初始化config，可以通过 json / umd / esm 动态下载，也可以把代码拷贝到本地
	const [initialConfig, setInitialConfig] = useState(null)

	// immutable config
	const [config, dispatch] = useReducer(configReducer, null)
	// polarisApp 实例
	const [polarisApp, setPolarisApp] = useState<any | null>(null)

	// container 元素
	const container = useRef<HTMLDivElement>(null!)

	// 动态获取 PolarisApp 和 initialConfig（仅运行一次）
	useEffect(() => {
		// fetchPolarisApp().then(setPolarisAppClass)
		// fetchInitialConfig().then(setInitialConfig)
	}, [])

	// 初始化（仅运行一次）
	useEffect(() => {
		if (PolarisAppClass && initialConfig) {
			const polarisApp = new PolarisAppClass(container.current, structuredClone(initialConfig))
			setPolarisApp(polarisApp)
			dispatch({ type: 'init', payload: structuredClone(initialConfig) })
		}
	}, [PolarisAppClass, initialConfig])

	// 同步 config（每次 config 变化后运行）
	useEffect(() => {
		if (polarisApp && config) {
			polarisApp.configManager.setConfig(structuredClone(config))
		}
	}, [config, polarisApp])

	return (
		<div>
			{/* 预览容器 */}
			<div ref={container}></div>
			{/* 编辑器UI */}
			<div>
				{config?.app && (
					<label>画面宽度</label>
					<input type="range" min="100" max="1000" value={config.app.width} onChange={(e) => dispatch({ type: 'app:change', payload: {...config.app, width: e.target.value} })}>
				)}
			</div>
		</div>
	)
}

```

## 维护指南

- config 的类型定义在 [../schema/config](../schema/config) 中，在其他项目中时应同时复制这两个文件夹。
- config 的修改应该是向后兼容的，实验性的 字段 用 $开头，实验性字段不保证兼容性

### 更新 config 的步骤

- 修改 [../schema/config](../schema/config) 中的类型定义
- 对应添加 [./ConfigManager.ts](./ConfigManager.ts) 中的 `ConfigEventData` 接口
  - 该接口表明，config 变化时，会触发的事件
  - 这些事件也是脏检查的最小单元
- 在 [./utils/digest.ts](./utils/digest.ts) 中添加脏检查逻辑，触发以上事件
- 在 [./utils/registerConfigSync.ts](./utils/registerConfigSync.ts) 中添加 config 同步逻辑
  - 该函数表明，如何从以上事件来更新 config （相当于脏检查的逆向过程）
- 在 [./actions.ts](./actions.ts) 中添加 新增事件对应的 action
  - 每个事件对应一个相同名字、相同功能的 action
  - 直接从 registerConfigSync 中 copy 过来即可，改一下变量名

最后，在 [../../apps/App.ts](../../apps/App.ts#App.watchConfig) 中，监听事件，更新 polaris app

polaris app 响应 config 变化需要保证结果正确，但是不保证过程高效（我们假设该过程只在开发环节触发，不在运行时触发）。因此如果很难增量响应，就直接重建整个 Polaris app 即可。
