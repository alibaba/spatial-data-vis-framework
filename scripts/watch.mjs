import chokidar from 'chokidar'

import path from 'path'

import { execSync, spawn, exec, execFileSync } from 'child_process'

import colors from 'colors/safe.js'

function yellow() {
	console.log(colors.bgBlue.yellow.bold('\n', ...arguments))
}
function green() {
	console.log(colors.bgBlue.green.bold('\n', ...arguments))
}

console.log(colors.green.bold.underline.bgBlue('read local packages...'))
const packagesJSON = execSync('npx lerna ls --json --all').toString()
const packageALL = JSON.parse(packagesJSON)
// console.log(packageALL)

import blist from './ignore.mjs'
const validPackages = packageALL.filter((pac) => {
	let inBL = false
	blist.forEach((rule) => {
		inBL = inBL || pac.location.includes(rule)
	})

	return !inBL
})
// console.log('validPackages', validPackages)

function getLocalPackageByName(name) {
	const pkg = validPackages.filter((p) => p.name === name)[0]
	return pkg
}

function getLocalPackageByPath(path) {
	const pkg = validPackages.filter((p) => path.includes(p.location))[0]
	return pkg
}

console.log(colors.green.bold.underline.bgBlue('read packages dependents...'))
const dependentGraphJSON = execSync('npx lerna list --graph').toString()
const dependentGraph = JSON.parse(dependentGraphJSON)
// console.log(dependentGraph)

green('analyzing impact-graph...')

const impactGraph = {}

{
	const keys = Object.keys(dependentGraph)
	keys.forEach((key) => {
		// 确定属于本地包
		const pkg = getLocalPackageByName(key)

		if (!pkg) {
			console.log(colors.yellow('\t', key, '不是monorepo本地package，或者在ignore名单中，将忽略'))
			return
		}

		const deps = dependentGraph[key]
		deps.forEach((depName) => {
			const pkg = getLocalPackageByName(depName)
			if (!pkg) {
				console.log(
					colors.yellow('\t', depName, '不是monorepo本地package，或者在ignore名单中，将忽略')
				)
				return
			}

			if (!impactGraph[depName]) {
				impactGraph[depName] = []
			}

			impactGraph[depName].push(key)
		})
	})
}

// console.log('impactGraph', impactGraph)
{
	for (const name of Object.keys(impactGraph)) {
		console.log(
			colors.cyan(name.slice(6), '=> [', impactGraph[name].map((a) => a.slice(6)).join(', '), ']')
		)
	}
}

function findAllDirtPkgs(pkg) {
	// const dirtList = []
	const dirtList = new Set()
	function dirtWalker(pkg) {
		// 不要重复添加
		// if (!dirtList.includes(pkg.name)) {
		// 	dirtList.push(pkg.name)
		// }
		dirtList.add(pkg.name)
		// 查找 impacts
		const impacts = impactGraph[pkg.name] || []
		for (const impactedPkgName of impacts) {
			const impactedPkg = getLocalPackageByName(impactedPkgName)
			if (impactedPkg) {
				dirtWalker(impactedPkg)
			}
		}
	}

	dirtWalker(pkg)
	return dirtList
}

/**
 * 编译列表
 */
let waitlist = new Set()
let building = false

/**
 *
 * @param {Set<string>} dirtList
 */
async function rebuildDirt(dirtList) {
	yellow('start building these packages', [...dirtList.values()].join(' '))

	const command = `npx`
	const args = ['lerna', 'run', '--no-private', '--stream', 'build']

	dirtList.forEach((pkgName) => {
		args.push(`--scope`, `${pkgName}`)
	})

	const sub = spawn(command, args, { stdio: 'inherit' })

	sub.on('close', (code) => {
		building = false
		green('building done')

		if (waitlist.size > 0) {
			yellow('waitlist not empty. start another building...')
			const newDirtlist = new Set(waitlist)
			waitlist.clear()
			building = true
			rebuildDirt(newDirtlist)
		}
	})
}

function fireDirtList(dirtList) {
	if (building) {
		yellow('another building runing... join wait list')
		dirtList.forEach((pkgName) => waitlist.add(pkgName))
	} else {
		yellow('builder available. start building...')
		building = true
		rebuildDirt(dirtList)
	}
}

const watcher = chokidar.watch([path.resolve(process.env.PWD, './packages')], {
	followSymlinks: false,
	ignored: ['**/node_modules/**', '**/dist/**', '**/*.tsbuildinfo'],
	ignoreInitial: true,
	atomic: 500,
})

green('started watching....')

watcher.on('all', (eventName, _path, stats) => {
	const pkg = getLocalPackageByPath(_path)
	// console.log(pkg)

	if (!pkg) {
		// '不是monorepo本地package，或者在ignore名单中，将忽略'
		info('detected change but ignoring...', depName)
		return
	}
	yellow('change detected. type:', eventName, pkg.name, _path)

	// buildPkgRecursively(pkg)

	const dirtList = findAllDirtPkgs(pkg)
	// console.log(dirtList)

	fireDirtList(dirtList)
})
