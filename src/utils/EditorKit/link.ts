const dict = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/**
 * 生成随机字符串，包含大小写英文字母和数字
 */
function randomString(len: number) {
	len = len || 32
	const a = dict.length
	let n = ''
	for (let i = 0; i < len; i++) n += dict.charAt(Math.floor(Math.random() * a))
	return n
}

type WidgetInfo = {
	title: string
	content: HTMLElement
	// position?: string
	// fold?: boolean
}

class EditorAgent {
	readonly uuid = 'EditorAgent:' + randomString(16)

	readonly agentVersion = '1'

	editorVersion = ''

	/**
	 * 是否链接到编辑器
	 * - 未连接的 agent 依然可以使用，但是所有行为会降级
	 */
	connected = false as boolean

	/**
	 * 编辑器是否处于 “编辑模式”
	 * - 在 Layer 创建时读取，Layer 生命周期内不会变化
	 * - “编辑模式”时，Layer可以显示一些编辑态特有的功能，例如辅助线、自定义面板、3D画笔等
	 */
	isEditing = false as boolean

	/**
	 * 当 editor 未连接时，所有的 widget 直接本地管理
	 */
	private readonly offlineWidget = new Map<
		string,
		Required<WidgetInfo> & {
			id: string
			wrapper: HTMLElement
		}
	>()

	private readonly widgetRoot = document.createElement('div')

	constructor() {
		this.widgetRoot.style.position = 'fixed'
		this.widgetRoot.style.left = '0'
		this.widgetRoot.style.bottom = '0'
		this.widgetRoot.style.zIndex = '999'

		this.update()
	}

	private update() {
		if (window['$PolarisEditor:Version']) {
			this.editorVersion = window['$PolarisEditor:Version']
			this.connected = true

			console.log('[EditorKit] Connected to Editor', this.editorVersion)

			if (window['$PolarisEditor:isEditing']) {
				this.isEditing = true
				document.body.appendChild(this.widgetRoot)
				console.log('[EditorKit] Editor is in editing mode')
			} else {
				this.widgetRoot.parentElement && document.body.removeChild(this.widgetRoot)
				console.log('[EditorKit] Editor is not in editing mode')
			}

			window.addEventListener('$PolarisEditor:isEditing:Change', (e) => {
				this.isEditing = e.detail.isEditing
				console.log('[EditorKit] Editor isEditing changed', this.isEditing)

				if (this.isEditing) {
					document.body.appendChild(this.widgetRoot)
				} else {
					this.widgetRoot.parentElement && document.body.removeChild(this.widgetRoot)
				}
			})
		}
	}

	/**
	 * 添加日志
	 * - 链接编辑器时，日志会同时输出到日志面板和 devtool
	 * - 未链接编辑器时，日志只会输出到 devtool
	 */
	log(log: {
		level?: 'info' | 'error'
		message?: string
		title?: string
		source?: string
		stack?: string
	}) {
		if (this.connected) {
			const title = log.title || log.message || 'Untitled'
			const message = typeof log === 'string' ? log : log.message || log.title
			const level = log.level || 'info'
			const source = log.source || undefined
			const stack = log.stack || undefined

			const event = new CustomEvent('$PolarisEditor:Log:Add', {
				detail: {
					title,
					message,
					level,
					source,
					stack,
					agent: this.uuid,
				},
			})
			window.dispatchEvent(event)
		} else {
			if (log.level === 'error') {
				console.error('[Unlinked EditorKit]', log.title, log.message, log.source, log.stack)
			} else {
				console.log('[Unlinked EditorKit]', log.title, log.message, log.source, log.stack)
			}
		}
	}

	info(msg: string) {
		this.log({
			title: msg.slice(0, 10) + (msg.length > 10 ? '...' : ''),
			message: msg,
			level: 'info',
		})
	}

	/**
	 * @experimental
	 *
	 * 致命错误，提示编辑器终止运行
	 * - 链接编辑器时，编辑器会进行转存、提示、停止 App 运行，避免 Layer 出错导致编辑器崩溃和配置丢失
	 * - 未链接编辑器时，会直接抛出错误
	 */
	// fatal(error?: Error) {
	// 	console.error('[Unlinked EditorKit]: Layer Fatal Error', error)
	// 	throw error
	// }

	addWidget(widget: WidgetInfo): string {
		const widgetID = randomString(16)

		if (this.connected) {
			const event = new CustomEvent('$PolarisEditor:Widget:Add', {
				detail: {
					// position: 'left-bottom',
					// fold: true,
					...widget,
					agent: this.uuid,
					widgetID,
				},
			})

			window.dispatchEvent(event)
		} else {
			const wrapper = document.createElement('div')
			const titleWrapper = document.createElement('div')
			const contentWrapper = document.createElement('div')

			wrapper.appendChild(titleWrapper)
			wrapper.appendChild(contentWrapper)

			titleWrapper.innerText = widget.title
			contentWrapper.appendChild(widget.content)

			this.widgetRoot.appendChild(wrapper)

			this.offlineWidget.set(widgetID, {
				// position: 'left-bottom',
				// fold: true,
				...widget,
				id: widgetID,
				wrapper,
			})
		}

		return widgetID
	}

	removeWidget(widgetID: string) {
		if (this.connected) {
			const event = new CustomEvent('$PolarisEditor:Widget:Remove', {
				detail: {
					widgetID,
				},
			})

			window.dispatchEvent(event)
		} else {
			const widget = this.offlineWidget.get(widgetID)
			const wrapper = widget?.wrapper

			wrapper && this.widgetRoot.removeChild(wrapper)

			this.offlineWidget.delete(widgetID)
		}
	}
}

export const editorAgent = new EditorAgent()

export const LOG = editorAgent.log.bind(editorAgent)
