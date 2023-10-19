import { isAssetUri } from './AppKit'
import { LOG } from './EditorKit'

/**
 * 单个控制点（色标）
 */
type ControlPoint = {
	/**
	 * 该控制点的位置（从左到右 0~1）
	 * 0 为头控制点 （headControlPoint）
	 * 1 为尾控制点 （tailControlPoint）
	 */
	pos: number
	/** 该控制点的颜色 */
	color: string
	/** 该控制点的透明度 */
	alpha: number
}

function hexToRgba(hex, alpha) {
	const r = parseInt(hex.slice(1, 3), 16)
	const g = parseInt(hex.slice(3, 5), 16)
	const b = parseInt(hex.slice(5, 7), 16)

	return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 根据色标数据生成data url */
export function generateImg(data: ControlPoint[]) {
	const canvas = document.createElement('canvas')
	const width = 128
	const height = 1

	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')!
	const gradient = ctx.createLinearGradient(0, 0, width, 0)

	data.forEach((item) => {
		gradient.addColorStop(item.pos, hexToRgba(item.color, item.alpha))
	})

	ctx.fillStyle = gradient
	ctx.fillRect(0, 0, width, height)

	return canvas.toDataURL()
}

export function parseGradientImg(string: string) {
	if (isAssetUri(string)) return string
	if (string.startsWith('data:')) return string

	try {
		const data = JSON.parse(string)

		return generateImg(data)
	} catch (error: any) {
		LOG({
			level: 'error',
			title: 'parseGradientImg 失败',
			message: error.message,
		})

		console.error(error)

		// 失败后返回默认颜色
		return generateImg([
			{ pos: 0, color: '#000000', alpha: 1 },
			{ pos: 1, color: '#ffffff', alpha: 1 },
		])
	}
}
