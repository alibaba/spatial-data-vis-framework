/* eslint-disable @typescript-eslint/no-non-null-assertion */
console.log('Polaris examples index')
console.log('entries', globalThis.entries)

type Tree = { name: string; path: string; children: Tree[] }

function buildTree(flatList: string[]) {
	const tree = { name: 'root', path: '/', children: [] } as Tree
	const map = new Map<string, Tree>()
	for (const item of flatList) {
		const parts = item.split('/')
		let parent = tree
		for (let i = 0; i < parts.length; i++) {
			const name = parts[i]
			let node = map.get(name)
			if (!node) {
				node = { name, children: [], path: '/' + parts.slice(0, i + 1).join('/') }
				map.set(name, node)
				parent.children.push(node)
			}
			parent = node
		}
	}
	return tree
}

console.log('tree', buildTree(globalThis.entries))

const tree = buildTree(globalThis.entries)

const li = document.createElement('li')

function makeTreeList(tree: Tree, parent: HTMLLIElement) {
	const ul = document.createElement('ul')
	parent.appendChild(ul)
	for (const child of tree.children) {
		if (child.children.length) {
			const li = document.createElement('li')
			li.textContent = child.name
			ul.appendChild(li)
			makeTreeList(child, li)
			continue
		} else {
			const li = document.createElement('li')

			const link = document.createElement('a')
			link.href = `.${child.path}/`
			link.text = child.name

			ul.appendChild(li)
			li.appendChild(link)
		}
	}
}

makeTreeList(tree, li)

document.body.appendChild(li.children[0])

export {}
