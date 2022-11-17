import { EventDispatcher } from '../../src/private/config/EventDispatcher'
import { EventLink } from '../../src/private/config/EventLink'
import { randomString } from '../../src/private/utils/random'

const params = new URL(document.location.href).searchParams

const isSecondary = !!params.get('isSecondary')
function inIframe() {
	try {
		return window.self !== window.top
	} catch (e) {
		return true
	}
}
const isIframe = inIframe()

function log(...args) {
	console.log(isIframe ? 'iframe:' : 'main:', ...args)
}

log('isSecondary', isSecondary)

const dispatcher = new EventDispatcher()
dispatcher.addEventListener('aaa', (e) => {
	log('aaa', e)
})
dispatcher.addEventListener('bbb', (e) => {
	log('bbb', e)
})

// create secondary iframe
if (!isSecondary) {
	const iframe = document.createElement('iframe')
	iframe.src = './?isSecondary=1'
	document.body.appendChild(iframe)

	const onload = () => {
		const eventLink = new EventLink('primary', dispatcher, iframe.contentWindow!)

		eventLink.addEventListener('secondaryConnected', (e) => {
			log('secondaryConnected')
		})

		setInterval(() => {
			dispatcher.dispatchEvent({ type: 'aaa', data: randomString(3) })
		}, 1000)

		iframe.removeEventListener('load', onload)
	}
	iframe.addEventListener('load', onload)
} else {
	const eventLink = new EventLink('secondary', dispatcher, window)
}
