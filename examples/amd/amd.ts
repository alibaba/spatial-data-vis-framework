const POLARIS_VERSION = '0.0.85'
// const BASE_URL = `https://dev.g.alicdn.com/dt-vis/polaris.gl/${POLARIS_VERSION}`
const BASE_URL = `http://localhost:2233`

window.require([`${BASE_URL}/polaris-gsi-gl2.umd.js`], (modulePolaris) => {
	console.log(modulePolaris)

	const p = new modulePolaris.Polaris({
		container: document.querySelector('#container'),
		width: 500,
		height: 500,
	})
	window['p'] = p

	// 依赖注入
	Object.entries(modulePolaris.dependencies).forEach(([k, v]) => {
		window.define(k, v)
	})

	window.require([`${BASE_URL}/std-helper.umd.js`], (moduleLayer) => {
		console.log(moduleLayer)
		const layer = new moduleLayer.default()
		p.add(layer)
	})
})
