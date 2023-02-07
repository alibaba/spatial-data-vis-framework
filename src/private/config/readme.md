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
- 之后都通过 dispatch 来修改 config，每次修改后调用 `polarisApp.configManager.setConfig(structuredClone(config))` 来同步 polarisApp 内部的 config

注意：

- configManager.getConfig 可以拿到其内部的 config，不要修改这个对象的任何部分，以免逃过脏检查
  - 日后可能会删掉这个接口
- setConfig 传入的 config 应该先深拷贝，并且可写（不能是 freeze 过的或者 immutable 的）
- 你可以假设 PolarisApp 可以响应任何 config 修改，但该过程可能很慢，并且可能是异步的。
  - 不应该利用 setConfig 来实现任何动画效果
- 所有的 config 修改都是 你的 editor 进行的，并通过 setConfig 同步给 polarisApp，polarisApp 不会主动修改 config

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
