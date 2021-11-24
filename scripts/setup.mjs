import { argv } from 'process'
import { constants, fstat } from 'fs'
import { readFile, writeFile, copyFile, access, rename, unlink, symlink } from 'fs/promises'
import path from 'path'

import { execSync, spawn, exec, execFileSync } from 'child_process'

console.log(argv)
console.log(process.env.PWD)

import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
console.log(__dirname)

// 是否使用本地 GSI 代码库
const localGSIArgv = argv.filter((a) => a.includes('--gsi='))[0]

const useLocalGSI = !!localGSIArgv
const gsiPath = useLocalGSI ? localGSIArgv.split('=')[1] : null

console.log(useLocalGSI, gsiPath)

if (useLocalGSI) {
	console.log('设置了本地的 GSI repo 目录，将不会从 npm 安装 @gsi/* 的依赖而从 gsi repo 中 link')
	console.log('检查 GSI 路径...')

	try {
		await access(path.resolve(process.env.PWD, gsiPath, './packages/utils/umbrella/package.json'))
	} catch (error) {
		console.error(error)
		throw 'GSI 路径无法解析'
	}

	try {
		await access(path.resolve(process.env.PWD, './gsi-packages'))
		await unlink(path.resolve(process.env.PWD, './gsi-packages'))
	} catch (error) {}

	await symlink(
		path.resolve(process.env.PWD, gsiPath, './packages'),
		path.resolve(process.env.PWD, './gsi-packages'),
		'dir'
	)
}

const id = Math.floor(Math.random() * 9999) + ''
console.log(id)

execSync(`node ${path.resolve(__dirname, './packageJsonBackup.mjs')} --id=${id}`, {
	stdio: 'inherit',
})

import blist from './ignore.mjs'

// process.exit(0)

// 不处理的package
const packageBlacklist = [...blist]

const NO_EXAMPLES = argv.includes('--no-examples')

if (NO_EXAMPLES) {
	packageBlacklist.push('examples')
}

const packagesJSON = execSync('npx lerna ls --json --all').toString()
const packageALL = JSON.parse(packagesJSON)

// 黑名单过滤掉
const ignoredPackages = packageALL.filter((pac) => {
	let inBL = false
	packageBlacklist.forEach((rule) => {
		inBL = inBL || pac.location.includes(rule)
	})

	return inBL
})
console.log('ignoredPackages', ignoredPackages)

await Promise.all(
	ignoredPackages.map(async (pkg) => {
		console.log('ignore package: ', pkg.name)
		const pjsonPath = path.resolve(pkg.location, 'package.json')

		const pjson = await readFile(pjsonPath)
		const originalJson = JSON.parse(pjson)

		// NOTE can not be {} or yarn will throw
		delete originalJson.scripts
		delete originalJson.dependencies
		delete originalJson.devDependencies
		delete originalJson.peerDependencies
		delete originalJson.bundledDependencies
		delete originalJson.optionalDependencies

		try {
			await writeFile(pjsonPath, JSON.stringify(originalJson))
		} catch (error) {
			console.error(pkg.name, tsconfigPath, error)
		}
	})
)

// remove optinal dependents from package.json
await Promise.all(
	packageALL.map(async (pkg) => {
		const pjsonPath = path.resolve(pkg.location, 'package.json')

		const pjson = await readFile(pjsonPath)
		const originalJson = JSON.parse(pjson)

		if (originalJson.optionalDependencies) {
			console.log('fix package optinal dep: ', pkg.name)

			// NOTE can not be {} or yarn will throw
			delete originalJson.optionalDependencies

			try {
				await writeFile(pjsonPath, JSON.stringify(originalJson))
			} catch (error) {
				console.error(pkg.name, tsconfigPath, error)
			}
		}
	})
)

try {
	execSync(`lerna bootstrap --force-local`, { stdio: 'inherit' })

	// # https://github.com/lerna/lerna/issues/2352
	// # lerna link is needed
	execSync(`lerna link --force-local`, { stdio: 'inherit' })

	// # should not hoist local packages
	execSync(`rm -rf ./node_modules/@polaris.gl`, { stdio: 'inherit' })
} catch (error) {
	console.error(error)
}

execSync(`node ${path.resolve(__dirname, './packageJsonRestore.mjs')} --id=${id}`, {
	stdio: 'inherit',
})

console.log('本次安装不会安装以下package的依赖，如果需要，可以自行到文件夹中安装')
console.log(packageBlacklist)
