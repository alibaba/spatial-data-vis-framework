/**
 * 原则上，package depends 中的本地 package 和 tsconfig 中的 references 应该是一一对应的。
 * 如果两者不同，则应该检查并修复
 */
/*eslint-env node*/
import { argv } from 'process'
import { constants, fstat } from 'fs'
import { readFile, writeFile, copyFile, access } from 'fs/promises'
import path from 'path'

import { execSync } from 'child_process'

console.log(argv)
console.log(process.env.PWD)

// 不处理的package
import packageBlacklist from './ignore.mjs'

const packagesJSON = execSync('npx lerna ls --json').toString()
const packageALL = JSON.parse(packagesJSON)

// 黑名单过滤掉
const packages = packageALL.filter((pac) => {
	let inBL = false
	packageBlacklist.forEach((rule) => {
		inBL = inBL || pac.location.includes(rule)
	})

	return !inBL
})
console.log(packages)

packages.forEach(async (pkg) => {
	const pjsonPath = path.resolve(pkg.location, 'package.json')

	const pjsonText = (await readFile(pjsonPath)).toString()
	const pjson = JSON.parse(pjsonText)

	/**
	 * edit #start
	 */

	// re order json
	const license = pjson.license
	const publishConfig = pjson.publishConfig
	const files = pjson.files
	const scripts = pjson.scripts
	const dependencies = pjson.dependencies
	const devDependencies = pjson.devDependencies
	const type = pjson.type

	delete pjson.license
	delete pjson.publishConfig
	delete pjson.files
	delete pjson.scripts
	delete pjson.dependencies
	delete pjson.devDependencies
	delete pjson.type

	// insert here
	pjson.type = 'module'

	pjson.license = license
	pjson.publishConfig = publishConfig
	pjson.files = files
	pjson.scripts = scripts
	pjson.dependencies = dependencies
	pjson.devDependencies = devDependencies
	pjson.type = type

	// delete pjson.type
	delete pjson.gitHead

	/**
	 * edit #end
	 */

	await writeFile(pjsonPath, JSON.stringify(pjson, undefined, '\t'))
})
