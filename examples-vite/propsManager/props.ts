import { PropsManager } from '@polaris.gl/utils-props-manager'

const m = new PropsManager<{ cc: 'dd' | 'ee'; ff: 'gg' | 'kk' }>()

window['m'] = m
