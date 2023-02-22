#!/usr/bin/env node

/**
 * template of a script that can be called by daemon service API.
 *
 * @note return things by console.log
 * @note this script can have external dependencies. It will only run after npm-install.
 */
import colors from 'colors/safe.js'
import { dirname, resolve } from 'path'
import { argv as rawArgv } from 'process'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const __dirname = dirname(fileURLToPath(import.meta.url))
const argv = yargs(hideBin(rawArgv)).argv

function main(argv) {
	if (argv.error) {
		throw new Error(argv.error)
	} else {
		console.log('hello world')
	}
}

main(argv)
