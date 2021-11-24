import { argv } from 'process'
import { constants, fstat } from 'fs'
import { readFile, writeFile, copyFile, access, rename, unlink, symlink } from 'fs/promises'
import path from 'path'

import { execSync, spawn, exec, execFileSync } from 'child_process'

console.log(argv)
console.log(process.env.PWD)

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

	// try {
	// 	await access(path.resolve(process.env.PWD, gsiPath, './node_modules/@gs.i-no-hoist'))
	// } catch (error) {
	// 	console.error(error)
	// 	throw 'GSI 项目没有setup，请先去 GSI 目录 setup'
	// }

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

import blist from './blacklist.mjs'

// process.exit(0)

// 不处理的package
const packageBlacklist = [...blist, 'examples']

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
console.log('黑名单', ignoredPackages)
// const unignoredPackages = packageALL.filter((pac) => {
// 	let inBL = false
// 	packageBlacklist.forEach((rule) => {
// 		inBL = inBL || pac.location.includes(rule)
// 	})

// 	return !inBL
// })
// console.log('白名单', unignoredPackages)

const changedFiles = []

// 处理黑名单中不安装依赖的包
for (const pkg of ignoredPackages) {
	console.log('ignore package: ', pkg.name)
	const pjsonPath = path.resolve(pkg.location, 'package.json')
	const pjsonBacPath = path.resolve(pkg.location, 'package.json.bac')

	const pjson = await readFile(pjsonPath)
	const originalJson = JSON.parse(pjson)

	// NOTE can not be {} or yarn will throw
	delete originalJson.scripts
	delete originalJson.dependencies
	delete originalJson.devDependencies
	delete originalJson.peerDependencies
	delete originalJson.bundledDependencies
	delete originalJson.optionalDependencies

	// backup

	try {
		console.log('临时修改 pjson ', pjsonPath, '->', pjsonBacPath)
		await rename(pjsonPath, pjsonBacPath)
		await writeFile(pjsonPath, JSON.stringify(originalJson))

		changedFiles.push([pjsonPath, pjsonBacPath])
	} catch (error) {
		await unlink(pjsonPath)
		await rename(pjsonBacPath, pjsonPath)

		console.error(error)
		console.log(pkg.name, tsconfigPath)
	}
}

// function deleteGSIFromDep(dep) {
// 	if (!dep) {
// 		return
// 	}

// 	const keys = Object.keys(dep)

// 	keys.forEach((name) => {
// 		if (name.includes('@gs.i/')) {
// 			delete dep[name]
// 		}
// 	})
// }

// // 处理 GSI 本地link
// if (useLocalGSI) {
// 	for (const pkg of unignoredPackages) {
// 		console.log('忽略 GSI: ', pkg.name)
// 		const pjsonPath = path.resolve(pkg.location, 'package.json')
// 		const pjsonBacPath = path.resolve(pkg.location, 'package.json.bac')

// 		const pjson = await readFile(pjsonPath)
// 		const originalJson = JSON.parse(pjson)

// 		// NOTE can not be {} or yarn will throw
// 		deleteGSIFromDep(originalJson.dependencies)
// 		deleteGSIFromDep(originalJson.devDependencies)
// 		deleteGSIFromDep(originalJson.peerDependencies)
// 		deleteGSIFromDep(originalJson.bundledDependencies)
// 		deleteGSIFromDep(originalJson.optionalDependencies)

// 		// backup

// 		try {
// 			console.log('临时修改 pjson ', pjsonPath, '->', pjsonBacPath)
// 			await rename(pjsonPath, pjsonBacPath)
// 			await writeFile(pjsonPath, JSON.stringify(originalJson))

// 			changedFiles.push([pjsonPath, pjsonBacPath])
// 		} catch (error) {
// 			await unlink(pjsonPath)
// 			await rename(pjsonBacPath, pjsonPath)

// 			console.error(error)
// 			console.log(pkg.name, tsconfigPath)
// 		}
// 	}
// }

try {
	execSync(`lerna bootstrap -- --force-local`, { stdio: 'inherit' })

	// # https://github.com/lerna/lerna/issues/2352
	// # lerna link is needed
	execSync(`lerna link --force-local`, { stdio: 'inherit' })

	// # should not hoist local packages
	// execSync(`rm -rf ./node_modules/@gs.i`, { stdio: 'inherit' })

	// if (useLocalGSI) {
	// 	console.log('link 本地 gsi')

	// 	try {
	// 		await access(path.resolve(process.env.PWD, './node_modules/@gs.i'))
	// 		await unlink(path.resolve(process.env.PWD, './node_modules/@gs.i'))
	// 	} catch (error) {}

	// 	await symlink(
	// 		path.resolve(process.env.PWD, gsiPath, './node_modules/@gs.i-no-hoist'),
	// 		path.resolve(process.env.PWD, './node_modules/@gs.i'),
	// 		'dir'
	// 	)
	// }

	for (const changedFile of changedFiles) {
		const [pjsonPath, pjsonBacPath] = changedFile

		await unlink(pjsonPath)
		await rename(pjsonBacPath, pjsonPath)
	}
} catch (error) {
	for (const changedFile of changedFiles) {
		const [pjsonPath, pjsonBacPath] = changedFile

		await unlink(pjsonPath)
		await rename(pjsonBacPath, pjsonPath)
	}

	console.error(error)
}

console.log('本次安装不会安装以下package的依赖，如果需要，可以自行到文件夹中安装')
console.log(packageBlacklist)
