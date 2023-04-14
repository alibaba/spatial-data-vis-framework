export function getErrorMask() {
	const errorMask = document.createElement('div')
	errorMask.style.position = 'absolute'
	errorMask.style.top = '0'
	errorMask.style.left = '0'
	errorMask.style.width = '100%'
	errorMask.style.height = '100%'
	errorMask.style.backgroundColor = 'rgba(100, 0, 0, 0.5)'
	errorMask.style.color = 'white'
	errorMask.style.zIndex = '9999'
	errorMask.style.alignItems = 'center'
	errorMask.style.justifyContent = 'center'
	errorMask.style.display = 'none'

	const errorMaskText = document.createElement('div')
	errorMaskText.style.fontSize = '30px'
	errorMaskText.style.fontWeight = 'bolder'
	errorMaskText.style.fontFamily = 'var(--monospace-font)'
	errorMaskText.style.textAlign = 'center'
	errorMaskText.style.padding = '20px'
	errorMaskText.style.maxWidth = '80%'
	errorMaskText.style.wordBreak = 'break-all'
	errorMaskText.style.whiteSpace = 'pre-wrap'
	errorMask.appendChild(errorMaskText)

	return {
		errorMask,
		errorMaskText,
	}
}
