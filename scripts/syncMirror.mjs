// sync all packages for CN npm mirror

/*eslint-env node*/
import { argv } from 'process'
import { constants, fstat } from 'fs'
import { readFile, writeFile, copyFile, access, rename, unlink } from 'fs/promises'
import path from 'path'

import { execSync, spawn, exec, execFileSync } from 'child_process'

const clientArg = argv.filter((str) => str.includes('--client='))[0]
const hasClient = !!clientArg

if (!hasClient) {
	console.error('Please specify a client with --client=xxx (etc. --client=cnpm)')
	process.exit(1)
}

const client = clientArg.split('=')[1]

const packagesJSON = execSync('npx lerna ls --json --all').toString()
const packageALL = JSON.parse(packagesJSON)

packageALL.forEach((pkg) => {
	spawn(`${client}`, [`sync`, `${pkg.name}`], { stdio: 'inherit' })
	// exec(`${client} sync ${pkg.name}`).stdout.pipe(process.stdout)
})

// exec(`${client} sync ${packageALL.map((p) => p.name).join(' ')}`).stdout.pipe(process.stdout)
