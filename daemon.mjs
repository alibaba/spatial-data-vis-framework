#!/usr/bin/env node

/**
 * The daemon server of Polaris App Project.
 * 用于对该工程的自动化部署和跨应用控制。
 */
import { exec } from 'child_process'
import colors from 'colors/safe.js'
import cors from 'cors'
import express from 'express'
import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { argv as rawArgv } from 'process'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const __dirname = dirname(fileURLToPath(import.meta.url))

const argv = yargs(hideBin(rawArgv)).argv

console.log(__dirname, argv)

if (!argv.host) console.log(colors.bgYellow('No host specified, using localhost'))
if (!argv.port) console.log(colors.bgYellow('No port specified, using 3000'))

const host = argv.host || 'localhost'
const port = argv.port || 3000

/**
 * Daemon Status
 * @type {null | 'idle' | 'busy' | 'stopped' | 'error'}
 */
let status = null

/**
 * Current job working on.
 * @type {null | string}
 */
let job = null

const app = express()
app.use(cors())

// root
app.get('/', (req, res) => {
	res.send('Polaris App Project Daemon: this is working...')
})

// status check
app.get('/status', (req, res) => {
	res.send({
		success: true,
		status,
		job,
	})
})

// execute a script
app.get('/scripts/:script', async (req, res) => {
	const script = req.params.script
	const scriptPath = resolve(__dirname, 'scripts', script)
	const params = req.query
	const paramsCLI = Object.entries(params)
		.map(([k, v]) => `--${k}=${v}`)
		.join(' ')
	const command = `node ${scriptPath} ${paramsCLI}`

	if (existsSync(scriptPath)) {
		status = 'busy'
		job = script

		exec(command, {}, (error, stdout, stderr) => {
			if (error) {
				status = 'idle'
				job = null
				res.send({
					success: false,
					script,
					scriptPath,
					params,
					command,
					error,
					stderr,
				})
			} else {
				status = 'idle'
				job = null
				res.send({
					success: true,
					script,
					scriptPath,
					params,
					command,
					stdout,
				})
			}
		})
	} else {
		res.send({
			success: false,
			message: 'Can not find script.',
			scriptPath,
			params,
			command,
		})
	}
})

app.listen(port, host, () => {
	console.log(colors.green(`PolarisApp Project Daemon listening on ${host}:${port}`))

	status = 'idle'
})
