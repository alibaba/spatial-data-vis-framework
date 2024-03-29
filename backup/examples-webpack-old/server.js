/* eslint-disable */

const express = require('express')
const webpack = require('webpack')
const jade = require('pug')
const path = require('path')
const fs = require('fs')
const comp = require('compression')

// create normal express app
const app = express()

// listen
// 获取 host IP
const interfaces = require('os').networkInterfaces()
let ip = 'localhost'
for (const devName in interfaces) {
	const iface = interfaces[devName]
	for (let i = 0; i < iface.length; i++) {
		const alias = iface[i]
		if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
			ip = alias.address
		}
	}
}

const port = 8111

console.log(`Listening 👉  http://localhost:${port} 👈 \n`)

app.listen(port, '0.0.0.0', (err) => {
	if (err) {
		console.log(err)
	}
})

// create a webpack conpiter
const config = require('./webpack.config')
const compiler = webpack(config)

// set dev_option
const devOption = {
	stats: {
		entrypoints: false,
		modules: false,
		colors: true,
		version: true,
		warnings: false,
		hash: false,
		builtAt: false,
		performance: false,
	},
	publicPath: config.output.publicPath, // 静态文件位置
	headers: {
		'Access-Control-Allow-Origin': '*',
	},
}

// app.use("/assets", express.static(__dirname + '/assets', {maxAge: 86400000}))
app.use('/assets', express.static(path.join(__dirname, '/assets')))

// gzip
app.use(comp())

// use webpack middleware with compiter & dev_option
app.use(require('webpack-dev-middleware')(compiler, devOption))
// app.use(require('webpack-hot-middleware')(compiler))

app.use(function (req, res, next) {
	req.headers['if-none-match'] = 'no-match-for-this'
	next()
})

app.get('/favicon.ico', (req, res) => {
	res.end('')
})

app.get('/getTime', (req, res) => {
	const data = {
		success: true,
		time: new Date().getTime(),
	}
	res.writeHead(200, { 'Content-Type': 'application/json charset=utf-8' })
	res.end(JSON.stringify(data))
})

app.get('/html/:htmlName', (req, res) => {
	console.log('visiting html:', req.params.htmlName)
	res.sendFile(path.join(__dirname, 'demo/html', `${req.params.htmlName}.html`))
})

// compit jade & route '/'to index.html
app.get('/:demoName', (req, res) => {
	console.log('visiting demo:', req.params.demoName)
	const html = jade.renderFile(path.join(__dirname, 'entry.jade'), {
		demoName: req.params.demoName,
		ran: '?ran=' + Math.random(),
	})
	res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
	res.end(html)
})

// compit jade & route '/'to index.html
const demoEntries = getDemoEntries()
app.get('/', (req, res) => {
	console.log('visiting index')
	const html = jade.renderFile(path.join(__dirname, 'index.jade'), {
		demos: demoEntries,
	})
	res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
	res.end(html)
})

function getDemoEntries() {
	const dirPath = path.resolve(__dirname, './')
	const entries = []
	const pageDir = fs.readdirSync(dirPath) || []

	for (let j = 0; j < pageDir.length; j++) {
		const filePath = path.resolve(dirPath, pageDir[j])
		const fileStat = fs.statSync(filePath)
		const filename = path.basename(filePath)

		if (
			filename === 'node_modules' ||
			filename === 'typings' ||
			filename === 'proxy' ||
			filename === 'static' ||
			filename === 'assets' ||
			filename === 'design'
		) {
			continue
		}

		if (fileStat.isDirectory()) {
			const demos = fs.readdirSync(filePath)
			demos.forEach((demo) => {
				const ext = path.parse(demo).ext
				const name = path.parse(demo).name
				if (name.startsWith('_')) return
				if (ext === '.ts' || ext === '.js') {
					const relativePath = `${filename}/${name}`
					entries.push(name)
				}
			})
		}

		// if (fileStat.isDirectory() && !filename.startsWith('_')) {
		// 	entries.push(pageDir[j])
		// }
	}
	return entries
}
