console.log('Polaris examples index')
console.log('entries', globalThis.entries)

// import entries from './entries.json'

// console.log(entries)

// async function loadExample(name: string) {
// 	const { haha } = await import('./init/i')
// 	haha()
// }

// await loadExample('123')

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
