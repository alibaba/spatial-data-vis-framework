import { AppBaseConfig } from '../private/base/AppBase'

export const DefaultAppConfig: AppBaseConfig = {
	width: 1400,
	height: 700,

	fov: 20,
	antialias: 'msaa',

	background: 'transparent',

	autoResize: false,

	pitchLimit: [0, Math.PI * 0.7],

	debug: true,
}
