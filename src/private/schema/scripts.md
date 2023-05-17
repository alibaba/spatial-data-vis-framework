# 脚本系统详细设计

## 原则

- 不要在事件名中包含实例 ID，监听方不应该需要知道实例 ID 才能收到事件，事件名就是事件类型
- 全局事件脚本可以挂在任何实例上，如果要操作所挂的实例，需要检查 currentTarget 的类型、状态和接口是否支持
- 挂载行为不会产生事件，时机也不重要，不关心挂载对象的生命周期，甚至可以集中放在顶层，留个配对记录即可
- 如果需要操作某个实例，就挂到该实例上，如果需要操作很多实例，就挂到这些实例的 parent 上

## 经典场景

### 全局事件

- 一个 Layer 想要根据场景变化来触发内部行为
  - onSceneChange
  - 实现上似乎可以写在 Layer 内？因为该脚本只适用于一种 Layer。
  - 但是 Layer 是不知道 scene ID 的
  - 需要 Layer 实现 changeScene 接口或内部事件，然后在全局事件脚本中调用
  - 相当于脚本是在扩展 PolarisApp 的功能，而非 Layer。是在做编排，而非功能。
- 一个 Layer 想要根据 其他 Layer 的行为来触发内部行为
  - EventBus 的典型用例：结偶组件之间的通讯与联动
  - onCustomEvent
- 场景切换时想做相机动画
  - 在任意实例上监听 beforeSceneChange 事件，修改 duration 和 skipCamera 即可
  - 也可以 AfterSceneChange 后接管相机，做路径动画
- 场景切换时想要做一些相机和 Layer 之外的特殊行为
  - 例如：修改 Polaris 配置、渲染器配置、灯光配置
- 超出“场景”概念的控制能力
  - 例如：场景多到不可枚举，或者 layer 列表是动态的，只能用自定义事件来控制
- 数据变化时的行为
  - 例如：用 updateData 切换场景
  - 例如：对收到的数据做二次加工
- 额外的附加功能
  - 例如：性能和错误监控
    - onTick
    - onStart // 不能保证能得到 AppStart 事件，因为不能依赖挂载时机
    - onError
  - 例如：自动降帧
  - 例如：场景轮播
  - 例如：额外的内存清理
    - ?onAppDispose?

### Layer 事件

- 不改 Layer 的情况下，修改 Layer 行为
- 不写新 Layer 的情况下，用空 Layer 实现新的效果
- 特定 Layer 的数据过滤器

## 配置形式

#### Plan A

一个脚本关联一种事件

```typescript
type BusEventScript = {
	name: string
	id: string
	type: 'bus'

	eventType: string
	handler: string
}
```

复杂脚本可能涉及多个事件，例如：一个脚本里既有 onSceneChange，又有 onCustomEvent，或者有准备性的 onStart，又有实时性的 onTick。

#### Plan B

多入口脚本

```typescript
type BusEventScript = {
	name: string
	id: string
	type: 'bus'

	entries: {
		eventType: string
		handler: string
	}[]
}
```

可以细粒度的管理每个事件的入口，以及每个 handler 的运行上下文，也可以自动卸载

但还是要给出 bus 实例，不然无法发布事件

可以给个 this.busAgent，其中的 on off 和 emit 会自动加上实例 ID 并且检查 事件类型是否允许，还可以绑定销毁事件

```typescript
const entries = [
	{
		eventType: 'init',
		handler: /* javascript */ `
			console.log('I am a script!')

			this.local = {
				foo: 'bar',
			}
		`,
	},
	{
		eventType: 'custom:foo',
		handler: /* javascript */ `
			const currentTarget = event.currentTarget
			const bus = this.busAgent
		`,
	},
	{
		eventType: 'beforeSceneChange',
		handler: /* javascript */ `
			const prevScene = event.prevScene
			const nextScene = event.nextScene
			const currentTarget = event.currentTarget
			const bus = this.busAgent
		`,
	},
]
```

问题：事件名成为 config 的静态部分，不能动态监听事件，或者动态计算事件名

#### Plan C

自由脚本

```typescript
type BusEventScript = {
	name: string
	id: string
	type: 'bus'

	entry: string
}
```

其中 entry 的代码中可以监听任意事件，对于 Editor 实现来说最简单，但是内部行为是不可见的，要给很大的上下文

entry 中要直接给出 bus 实例，自由添加 listener

可以给个 this.busAgent

```typescript
const entry = /* javascript */ `
	console.log('I am a script!')
	console.log('I am constructing!')

	this.local = {
		foo: 'bar',
	}

	this.busAgent.on('custom:foo', (event) => {
		const currentTarget = event.currentTarget
		const bus = this.busAgent
	})

	this.busAgent.on('beforeSceneChange', (event) => {
		const prevScene = event.prevScene
		const nextScene = event.nextScene
		const currentTarget = event.currentTarget
		const bus = this.busAgent
	})
`
```

这个 entry 实际上就是 ScriptClass 的 constructor 里的一段代码。

这样看来，和 Plan A 是等效的，可以放回一个事件里，来做更好的封装：

### Back to Plan A：

```typescript
const eventType = 'scriptInit'
const handler = /* javascript */ `
	console.log('I am a init-ing script!')

	// 该脚本也是个事件回调，有自己的 event 对象
	// 由于所有额外的事件都在这里实现，因此可以直接用闭包，而不用暴露 this

	const eventType = event.type // 'scriptInit'
	const busAgent = event.busAgent

	const local = {
		foo: 'bar',
	}

	busAgent.on('custom:foo', (event) => {
		const currentTarget = event.currentTarget
	})

	busAgent.on('beforeSceneChange', (event) => {
		const prevScene = event.prevScene
		const nextScene = event.nextScene
		const currentTarget = event.currentTarget
	})

	busAgent.on('tick', (event) => {})
`
```

### 总之

A 和 C 二选一

如果 A：

- 一个脚本只能监听一种事件
- handler 里，可以添加更多的监听
- 提供一个 scriptInit 事件，专门做为入口，用来监听多个事件
  - 像正常事件一样，要提供 target 和 currentTarget
  - target === this，currentTarget === 挂在该脚本的实例
  - 用户的操作空间，限制在 currentTarget 的生命周期里

如果 C：

- 实质上是让用户自己写 constructor
- 用户代码的运行时机是脚本对象自己的生命周期，这一点不太好，多暴露了内部实现

先选 A

## 挂载方式

### Plan A

所有可挂载的对象都有一个 `scripts` 属性，是一个数组，里面是脚本 ID。

```typescript
type LayerConfig = {
	// ...
	scripts: string[]
}
type SceneConfig = {
	// ...
	scripts: string[]
}
type StageConfig = {
	// ...
	scripts: string[]
}
type AppConfig = {
	// ...
	scripts: string[]
}
type DataStubConfig = {
	// ...
	scripts: string[]
}
```

优点：设计上规整，谁的就挂谁下面

缺点：繁琐，对 config 改动很大

影响：

- script 实例是没有可见 ID 的，也不应该被引用，其生命周期也不暴露
- config.scripts 实质上成为引用树的 root，因为其他所有对象都可以引用脚本

### Plan B

集中记录 scriptAttachments 配对关系

```typescript
type AppConfig = {
	// ...
	scripts: { name; id; type; handler }[]
	attachments: { script; target }[]
}
```

优点：以最小的改动实现完整功能，对于 App 和 编辑器来说支持都简单，Script 表现的像是附加功能

缺点：设计特殊

无论如何：

- 对 script 的任何修改都应该重建整个 App

## 脚本自身的生命周期

暂时不保证脚本自身的生命周期，也不保证运行时机，

当前的实现：

- “app 所有元素创建后，首次渲染前” 进行脚本初始化和挂载
  - 每个脚本实例化一个脚本对象，挂多个元素？
  - 每组挂载实例化一个脚本对象？
  - 同类脚本不提供共享空间的话，两种方案没区别
  - 共享空间也可以靠额外的方案实现，不需要共享脚本实例

这样回调里才总是能拿到 currentTarget，代价是不能拦截元素的创建，是否要向前调生命周期以后再说

- “app 所有元素销毁前” 进行脚本销毁？
- 不提供脚本销毁事件，直接用 app 的销毁比较好，弱化脚本存在感

## 事件列表

全局事件

- tick
  - 每帧 render 前的某个时刻
  - target: PolarisApp
- afterInit
- dispose
- beforeSceneChange
  - 场景切换前，可以拦截切换效果
  - （是否包括初始化场景切换？）
  - target: PolarisApp
- afterSceneChange
  - 场景切换后
  - target: PolarisApp
- beforeUpdateData
  - 数据输入，但是传给 Layer 前，可以拦截数据并修改
  - target: PolarisApp
- $xxx
  - 自定义事件，可以在脚本里自由触发
  - 需要与内置事件隔离，避免用户触发内部事件，检查关键字或者加前缀？
  - target: 触发事件的脚本所挂载的对象

config change 相关的事件不再额外设计，在 afterInit 中获取 configManager 即可

## 外部交互

Polaris App 实例的所有者（例如 大屏搭建平台），要通过事件总线与 Polaris App 相互交互。

（这里的"事件总线"对一个 Polaris App 来说是全局的，但在运行上下文中可以有多个 Polaris App 实例，每个拥有独立的总线，而非公用）

考虑到 Polaris App 已经继承自 EventDispatcher，因此直接用它作为事件总线。

（该做法与 vue 相同）

```typescript
const app = new App()

app.addEventListener('afterInit', (event) => {
	console.log('app init-ed', event)
})

app.addEventListener('tick', (event) => {
	console.log('app tick', event)
})

app.addEventListener('$custom:foo', (event) => {
	console.log('$custom:foo', event)
})

app.dispatchEvent({ type: '$custom:bar', bar: 123 })
```

这样的问题是，外部用户将可以直接触发内部事件。

拦截方案是封装一层，对外也提供 busAgent

```typescript
const app = new App()

function validateCustomEventType(type: string) {
	if (!type.startsWith('$')) {
		throw new Error(`event type "${type}" is not valid custom event type`)
	}
}

function getEventBusAgent(currentTarget) {
	const handlerWrappers = new WeakMap<Function, Function>()

	return {
		on: (type, handler) => {
			const handlerWrapper = (e) => handler({ ...e, currentTarget })
			handlerWrappers.set(handler, handlerWrapper)

			app.addEventListener(type, handlerWrapper)

			// 自动清除
			app.addEventListener('dispose', () => {
				app.removeEventListener(type, handlerWrapper)
			})
		},
		off: (type, handler) => {
			const handlerWrapper = handlerWrappers.get(handler)
			if (!handlerWrapper) {
				console.warn(`handler ${handler} is not registered`)
			}
			app.removeEventListener(type, handler)
		},
		emit: (type, data) => {
			validateCustomEventType(type)
			app.dispatchEvent({ ...data, type, target: currentTarget })
		},
	}
}

const eventBus = app.getEventBusAgent(this) // 调用 emit 时，this 将作为 target 传给监听者

eventBus.on('afterInit', (event) => {
	console.log('app init-ed', event)
})

eventBus.on('tick', (event) => {
	console.log('app tick', event)
})

eventBus.on('$custom:foo', (event) => {
	console.log('$custom:foo', event)
})

eventBus.emit('$custom:bar', { bar: 123 })
```
