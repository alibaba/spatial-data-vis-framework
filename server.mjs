import cors from 'cors'
import express from 'express'
import { readdir, stat } from 'fs/promises'
import http from 'http'
import https from 'https'
import { dirname } from 'path'
import path from 'path'
import selfsigned from 'selfsigned'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
console.log(`__dirname: ${__dirname}`)

const pem = selfsigned.generate([{ name: 'commonName', value: 'polaris.localhost' }], {
	days: 3650,
})

const app = express()

app.use(cors())
app.use('/intermediate', express.static(path.resolve(__dirname, 'intermediate'), { index: false }))

// listen
{
	const localhost = 'localhost'
	const httpPort = 6283
	const httpsPort = 6284

	const httpServer = await http.createServer(app)
	await httpServer.listen(httpPort, 'localhost')
	console.log(`🌟 HTTP  server listening on => http://${localhost}:${httpPort}`)

	const httpsServer = await https.createServer({ key: pem.private, cert: pem.cert }, app)
	await httpsServer.listen(httpsPort, 'localhost')
	console.log(`🌟 HTTPS server listening on => https://${localhost}:${httpsPort}`)

	console.log(`🌲 intermediate files served on https://${localhost}:${httpsPort}/intermediate`)
}

async function walk(root) {
	const results = []
	const list = await readdir(root)
	for (const file of list) {
		const filePath = path.join(root, file)
		const s = await stat(filePath)
		if (s && s.isDirectory()) {
			results.push(...(await walk(filePath)))
		} else {
			results.push(filePath)
		}
	}
	return results
}

// console.log(await walk(path.resolve(__dirname, 'intermediate')))
console.log(await walk('./intermediate'))
