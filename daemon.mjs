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
import { readdir, writeFile } from 'fs/promises'
import { dirname, extname, resolve } from 'path'
import process, { argv as rawArgv } from 'process'
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

// const vitePort = argv.vitePort
// if (!vitePort) {
// 	console.log(colors.bgYellow('No vite port specified. Certain scripts may not work.'))
// }

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
app.use(express.json())
app.use(express.text())
app.use(express.raw())
app.use(function (error, req, res, next) {
	if (error instanceof SyntaxError) {
		// body parser error
		res.send({
			success: false,
			error,
		})
	} else {
		next()
	}
})

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

// get config preset list
app.get('/config', async (req, res) => {
	const configPresetsPath = resolve(__dirname, 'src/config')
	const configPresetFiles = await readdir(configPresetsPath)

	res.send({
		success: true,
		configPresets: configPresetFiles,
	})
})

// create a new one
app.post('/config/:preset', async (req, res) => {
	if (extname(req.params.preset) !== '.json') {
		res.send({
			success: false,
			message: 'Invalid config preset name. Only *.json is supported.',
		})

		return
	}

	const configPresetPath = resolve(__dirname, 'src/config', `${req.params.preset}`)

	if (existsSync(configPresetPath)) {
		res.send({
			success: false,
			message: 'Config preset already exists.',
		})

		return
	}

	const newConfigPreset = req.body

	await writeFile(configPresetPath, JSON.stringify(newConfigPreset, null, 2))

	res.send({
		success: true,
	})
})

// edit an existing config preset
app.put('/config/:preset', async (req, res) => {
	try {
		if (extname(req.params.preset) !== '.json') {
			res.send({
				success: false,
				message: 'Invalid config preset name. Only *.json is supported.',
			})

			return
		}

		const configPresetPath = resolve(__dirname, 'src/config', `${req.params.preset}`)

		if (!existsSync(configPresetPath)) {
			res.send({
				success: false,
				message: 'Config preset does not exist.',
			})

			return
		}

		const newConfigPreset = req.body

		await writeFile(configPresetPath, JSON.stringify(newConfigPreset, null, 2))

		res.send({
			success: true,
		})
	} catch (error) {
		res.send({
			success: false,
			error,
			name: error.name,
			errorMessage: error.message,
			stack: error.stack,

			message: 'Failed to edit config preset.(Unknown error)',
		})
	}
})

app.listen(port, host, () => {
	console.log(colors.green(`PolarisApp Project Daemon listening on http://${host}:${port}`))

	status = 'idle'
})

function handleKill() {
	console.warn(`Daemon service killed by parent.`)
	process.exit()
}

// catches ctrl+c event
process.on('SIGINT', () => {
	console.warn(`Daemon service stopped by user.`)
	process.exit()
})
// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', handleKill)
process.on('SIGUSR2', handleKill)
process.on('SIGTERM', handleKill)
//catches uncaught exceptions
process.on('uncaughtException', () => {
	console.error(`Daemon service stopped by uncaught exception.`)
	process.exit()
})
