const dict = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/**
 * 生成随机字符串，包含大小写英文字母和数字
 */
export function randomString(len: number) {
	len = len || 32
	const a = dict.length
	let n = ''
	for (let i = 0; i < len; i++) n += dict.charAt(Math.floor(Math.random() * a))
	return n
}
