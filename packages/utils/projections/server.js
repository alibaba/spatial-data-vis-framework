/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

const express = require('express')
const webpack = require('webpack')
const jade = require('pug')
const path = require('path')
const fs = require('fs')
// const comp = require('compression')

// create normal express app
const app = express()

// listen
// 获取 host IP
const interfaces = require('os').networkInterfaces()
let ip = 'localhost'
for (let devName in interfaces) {
	const iface = interfaces[devName]
	for (let i = 0; i < iface.length; i++) {
		const alias = iface[i]
		if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
			ip = alias.address
		}
	}
}

const port = 8752

console.log(`Listening 👉  http://${ip}:${port} 👈 \n`)

app.listen(port, '0.0.0.0', (err) => {
	if (err) {
		console.log(err)
	}
})

// create a webpack conpiter
const config = require('./webpack.config')
const compiler = webpack(config)

// set dev_option
var devOption = {
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

// gzip
// app.use(comp())

// use webpack middleware with compiter & dev_option
app.use(require('webpack-dev-middleware')(compiler, devOption))
// app.use(require('webpack-hot-middleware')(compiler))

app.use(function (req, res, next) {
	req.headers['if-none-match'] = 'no-match-for-this'
	next()
})

// app.use("/assets", express.static(__dirname + '/assets', {maxAge: 86400000}))
app.use('/assets', express.static(path.join(__dirname, '/assets')))

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
	var html = jade.renderFile(path.join(__dirname, 'demo', 'entry.jade'), {
		demoName: req.params.demoName,
		ran: '?ran=' + Math.random(),
	})
	res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
	res.end(html)
})

// compit jade & route '/'to index.html
app.get('/', (req, res) => {
	console.log('visiting index')
	var html = jade.renderFile(path.join(__dirname, 'demo', 'index.jade'), {
		demos: getDemoEntries(),
	})
	res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
	res.end(html)
})

function getDemoEntries() {
	var dirPath = path.resolve(__dirname, 'demo/')
	var entries = []
	var reg = /.js$/
	var pageDir = fs.readdirSync(dirPath) || []

	for (var j = 0; j < pageDir.length; j++) {
		var filePath = path.resolve(dirPath, pageDir[j])
		var fileStat = fs.statSync(filePath)
		if (fileStat.isFile() && reg.test(pageDir[j])) {
			var name = pageDir[j].replace('.js', '')
			entries.push(name)
		}
	}
	return entries
}
