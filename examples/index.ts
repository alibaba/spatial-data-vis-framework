console.log('examples index')
console.log('entries', globalThis.entries)

const links = document.querySelector('#links') as HTMLUListElement
globalThis.entries.forEach((entry) => {
	const li = document.createElement('li')
	const link = document.createElement('a')
	link.href = `./${entry}/`
	link.text = entry
	// link.target = '_blank'
	li.appendChild(link)
	links.appendChild(li)
})

export {}
