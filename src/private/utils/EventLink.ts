import { EventDispatcher, EventMapBase } from '../config/EventDispatcher'

const ORIGINAL_DISPATCH_METHOD = Symbol('ORIGINAL_DISPATCH_METHOD')

/**
 * link two event dispatcher, by message channel
 */

export class EventLink<TEvents extends EventMapBase = any> extends EventDispatcher<{
	lostHeartbeat: { type: 'lostHeartbeat' }
	secondaryConnected: { type: 'secondaryConnected' }
}> {
	[ORIGINAL_DISPATCH_METHOD]: EventDispatcher<TEvents>['dispatchEvent']

	port: MessagePort

	inited = false

	private heartbeatTimer: any
	private lastTimeHeartbeatPong = performance.now()
	private mainListener: any

	constructor(
		public readonly mode: 'primary' | 'secondary',
		private readonly dispatcher: EventDispatcher<TEvents>,
		private readonly win: Window,
		private readonly retry = true
	) {
		super()
		this.connect()
	}

	connect() {
		if (this.mode === 'primary') {
			const channel = new MessageChannel()
			const port1 = channel.port1
			this.port = port1

			// initiate link
			this.win.postMessage('__init_ping', '*', [channel.port2])

			const onInit = (e) => {
				if (e.data === '__init_pong') {
					this.inited = true
					this.dispatchEvent({ type: 'secondaryConnected' })
					port1.removeEventListener('message', onInit)
					this.lastTimeHeartbeatPong = performance.now()
					this.startHeartbeat()
				}
			}

			port1.addEventListener('message', onInit)
			port1.start()

			// listen message

			this.mainListener = (e) => {
				const data = e.data
				if (data.__type === '__heartbeat_pong') {
					this.lastTimeHeartbeatPong = performance.now()
				}
			}

			this.port.addEventListener('message', this.mainListener)

			// probe event

			const dispatchEvent = this.dispatcher.dispatchEvent.bind(this.dispatcher)

			this[ORIGINAL_DISPATCH_METHOD] = dispatchEvent

			this.dispatcher.dispatchEvent = (e) => {
				// console.log('probed event', e)
				this.port.postMessage({
					__type: '__dispatchEvent',
					__event: e,
				})
				dispatchEvent(e)
			}
		} else {
			this.mainListener = (e) => {
				const data = e.data

				// event

				if (data.__type === '__dispatchEvent') {
					this.dispatcher.dispatchEvent(data.__event)
				}

				// heartbeat

				if (data.__type === '__heartbeat_ping') {
					this.port.postMessage({ __type: '__heartbeat_pong' })
				}
			}

			// wait for link

			const onInit = (e) => {
				if (e.data === '__init_ping') {
					window.removeEventListener('message', onInit)

					const port2 = e.ports[0]
					port2.postMessage('__init_pong')
					port2.start()

					this.port = port2
					this.inited = true

					this.port.addEventListener('message', this.mainListener)
				}
			}

			this.win.addEventListener('message', onInit)
		}
	}

	disconnect() {
		this.port.removeEventListener('message', this.mainListener)
		this.port.close()

		if (this.mode === 'primary') {
			this.dispatcher.dispatchEvent = this[ORIGINAL_DISPATCH_METHOD]
			clearInterval(this.heartbeatTimer)
		}
	}

	private startHeartbeat() {
		this.heartbeatTimer = setInterval(() => {
			this.port.postMessage({
				__type: '__heartbeat_ping',
			})

			const now = performance.now()
			const lag = now - this.lastTimeHeartbeatPong
			if (lag > 2000) {
				this.dispatchEvent({ type: 'lostHeartbeat' })

				console.warn('heartbeat lost after:', lag, 'will retry?', this.retry)

				if (this.retry) {
					this.disconnect()
					this.connect()
				}
			}
		}, 1000)
	}
}
