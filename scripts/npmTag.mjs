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
	// console.error('Please specify a client with --client=xxx (etc. --client=cnpm)')
	// process.exit(1)
	console.warn(
		'Please specify a client with --client=xxx (etc. --client=cnpm). Or will use nmp as default.'
	)
}

const client = clientArg?.split('=')[1] || 'npm'

const actionArg = argv.filter((str) => str.includes('--action='))[0]
const hasAction = !!actionArg

if (!hasAction) {
	console.error('Please specify a action with --action=xxx (etc. --action=add or rm)')
	process.exit(1)
}

const action = actionArg.split('=')[1]

if (action !== 'add' && action !== 'rm') {
	console.error('Please specify a action with --action=xxx (etc. --action=add or rm)')
	process.exit(1)
}

const tagArg = argv.filter((str) => str.includes('--tag='))[0]
const hasTag = !!tagArg

if (!hasTag) {
	console.error('Please specify a tag with --tag=xxx (etc. --tag=latest)')
	process.exit(1)
}

const tag = tagArg.split('=')[1]

const packagesJSON = execSync('npx lerna ls --json --all --no-private').toString()
const packageALL = JSON.parse(packagesJSON)

packageALL.forEach((pkg) => {
	const name = pkg.name
	const version = pkg.version
	if (action === 'add') {
		spawn(`${client}`, [`dist-tag`, `add`, `${name}@${version}`, tag], { stdio: 'inherit' })
	} else {
		spawn(`${client}`, [`dist-tag`, `rm`, `${name}`, tag], { stdio: 'inherit' })
	}
})
