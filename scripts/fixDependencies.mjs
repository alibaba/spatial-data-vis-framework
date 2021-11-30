import { argv } from 'process'
import * as fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { request } from 'https'
import { createInterface } from 'readline'

console.log(argv)
console.log(process.env.PWD)

// 不处理的package
import packageBlacklist from './ignore.mjs'
packageBlacklist.push('/examples')

try {
	const gsiInfo = await fetchGsiInfo()
	const packagesStr = execSync('npx lerna ls --json --all').toString()
	const packagesAll = JSON.parse(packagesStr)

	// 黑名单过滤掉
	const packagesArr = packagesAll.filter((pac) => {
		let inBL = false
		packageBlacklist.forEach((rule) => {
			inBL = inBL || pac.location.includes(rule)
		})
		return !inBL
	})

	const gsiLatestVer = gsiInfo['dist-tags']['latest']
	if (gsiLatestVer === undefined) {
		throw new Error('GSI lastest version not found')
	}
	const gsiPkgJson = gsiInfo.versions[gsiLatestVer]
	const lastestGsiPkgs = gsiPkgJson.dependencies
	console.log('lastestGsiPkgs')
	console.log(lastestGsiPkgs)

	packagesArr.forEach(async (pkg) => {
		const { name, location } = pkg
		const imports = await getPackageImports(path.resolve(location, './src'))
		const gsiImports = imports.gsi
		const otherImports = imports.other
		console.log(`package: ${name}`)
		console.log(`gsi imports: ${gsiImports}`)
		console.log(`other imports: ${otherImports}`)

		const pkgJsonPath = path.resolve(location, './package.json')

		const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath).toString())
		const dependencies = pkgJson.dependencies

		// delete @gs.i/all
		if (dependencies['@gs.i/all']) {
			delete dependencies['@gs.i/all']
		}

		// check unused dependencies
		Object.keys(dependencies).forEach((dependency) => {
			if (!gsiImports.includes(dependency) && !otherImports.includes(dependency)) {
				delete dependencies[dependency]
				console.log(`removed unused dependency: ${dependency}`)
			}
		})

		// add imported gsi pkgs
		gsiImports.forEach((gsiPkg) => {
			dependencies[gsiPkg] = lastestGsiPkgs[gsiPkg]
		})

		// write file
		fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 4))

		console.log(`package.json modification done. \n--------`)
	})
} catch (e) {
	console.log('Script error', e)
}

function fetchGsiInfo() {
	return new Promise((resolve, reject) => {
		const req = request('https://registry.npmjs.org/@gs.i/all', (res) => {
			let data = ''
			res.on('data', (chunk) => {
				data += chunk.toString()
			})
			res.on('close', () => {
				const pkgJson = JSON.parse(data)
				resolve(pkgJson)
			})
		})
		req.on('error', (error) => {
			reject(error)
		})
		req.end()
	})
}

async function getPackageImports(pathStr) {
	return new Promise((resolve) => {
		const gsiImports = new Set()
		const otherImports = new Set()
		const pendings = []
		const subdirs = fs.readdirSync(pathStr)
		subdirs.forEach((dir) => {
			if (dir === 'node_modules') return
			const absolute = path.resolve(pathStr, dir)
			walkDir(absolute, (file) => {
				pendings.push(getTsImports(file))
			})
		})
		Promise.all(pendings).then((importsList) => {
			importsList.forEach((imports) => {
				imports.gsi.forEach((pkgname) => {
					gsiImports.add(pkgname)
				})
				imports.other.forEach((pkgname) => {
					otherImports.add(pkgname)
				})
			})

			resolve({
				gsi: Array.from(gsiImports),
				other: Array.from(otherImports),
			})
		})
	})
}

function walkDir(dir, fileCallback) {
	const states = fs.statSync(dir)
	if (states.isFile()) {
		fileCallback(dir)
		return
	}
	if (states.isDirectory()) {
		fs.readdirSync(dir).forEach((file) => {
			const absolute = path.join(dir, file)
			const states = fs.statSync(absolute)
			if (states.isDirectory()) {
				return walkDir(absolute, fileCallback)
			} else if (states.isFile()) {
				fileCallback(absolute)
			}
		})
	}
}

const ignorePrefix = ['.', 'worker-loader!']
function getTsImports(tsFile) {
	return new Promise((resolve) => {
		const otherImports = new Set()
		const gsiImports = new Set()

		const rd = createInterface({
			input: fs.createReadStream(tsFile),
		})
		rd.on('line', (line) => {
			line = line.trimStart().trimEnd()

			if (
				line.startsWith('//') ||
				line.startsWith('/*') ||
				line.startsWith('*') ||
				line.startsWith('*/')
			) {
				return
			}

			if (line.includes(` from '`)) {
				const pkgFullName = line.substring(
					line.indexOf(` from '`) + ` from '`.length,
					line.length - 1
				)

				for (let i = 0; i < ignorePrefix.length; i++) {
					const prefix = ignorePrefix[i]
					if (pkgFullName.startsWith(prefix)) {
						return
					}
				}

				if (pkgFullName.startsWith('@gs.i')) {
					gsiImports.add(pkgFullName)
				} else {
					if (pkgFullName.startsWith('@')) {
						const firstIndex = pkgFullName.indexOf('/')
						const secondIndex = pkgFullName.indexOf('/', firstIndex + 1)
						if (secondIndex < 0) {
							otherImports.add(pkgFullName)
						} else {
							const pkgname = pkgFullName.substring(0, secondIndex)
							otherImports.add(pkgname)
						}
					} else {
						const firstIndex = pkgFullName.indexOf('/')
						if (firstIndex < 0) {
							otherImports.add(pkgFullName)
						} else {
							const pkgname = pkgFullName.substring(0, firstIndex)
							otherImports.add(pkgname)
						}
					}
				}
			}
		})
		rd.on('close', () => {
			const imports = {
				gsi: Array.from(gsiImports),
				other: Array.from(otherImports),
			}
			resolve(imports)
		})
	})
}
