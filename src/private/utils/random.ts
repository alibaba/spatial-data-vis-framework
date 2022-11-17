const dict = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz'
export function randomString(e: number) {
	e = e || 32
	const a = dict.length
	let n = ''
	for (let i = 0; i < e; i++) n += dict.charAt(Math.floor(Math.random() * a))
	return n
}
