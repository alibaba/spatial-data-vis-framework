/*eslint-env node*/
import { argv } from 'process'
import path from 'path'

import { execSync } from 'child_process'

// console.log(argv)
// console.log(process.env.PWD)
console.log(
	'\x1b[36m%s\x1b[0m',
	`
*********************
*                   *
* copy shared files *
*                   *
*********************
`
)

import blacklist from './ignore.mjs'

const packages = execSync('npx lerna ls -p')
	.toString()
	.split('\n')
	.filter((line) => {
		let inBL = false
		blacklist.forEach((rule) => {
			inBL = inBL || line.includes(rule)
		})

		// lerna notice 不会被返回掉
		// return !line.startsWith('lerna ') && line.trim() !== '' && !inBL
		return line.trim() !== '' && !inBL
	})
// console.log(packages)

const COPY_TS_CONFIG = true

if (COPY_TS_CONFIG) {
	const sharedBaseConfig = path.resolve(process.cwd(), 'shared', './tsconfig.base.json')
	const sharedBuildConfig = path.resolve(process.cwd(), 'shared', './tsconfig.build.json')
	for (const pkg of packages) {
		// console.log(pkg)
		const target = path.resolve(pkg, 'tsconfig.base.json')
		const targetBuild = path.resolve(pkg, 'tsconfig.build.json')

		// const targetBuildOld = path.resolve(pkg, 'tsconfig.base.package.json')
		// console.log(execSync(`rm -f ${targetBuildOld}`).toString())

		exe(`rm -f ${target}`)
		exe(`cp ${sharedBaseConfig} ${target}`)

		exe(`rm -f ${targetBuild}`)
		exe(`cp ${sharedBuildConfig} ${targetBuild}`)
	}
}

const COPY_SCRIPTS = true

if (COPY_SCRIPTS) {
	const sharedScripts = path.resolve(process.cwd(), 'shared', 'scripts')
	for (const pkg of packages) {
		// pkg
		const target = path.resolve(pkg, 'scripts')

		exe(`rm -rf ${target}`)
		exe(`cp -r ${sharedScripts} ${target}`)
		exe(`chmod 777 ${target}/*`)
	}
}

function exe(cmd) {
	const res = execSync(cmd).toString().trim()
	if (res !== '') {
		console.log(res)
	}
}
