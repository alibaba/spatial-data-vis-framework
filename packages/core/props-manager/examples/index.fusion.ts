// import { PropsManager } from '../src/PropsManager'

// import { LayerA, LayerB } from './usagePrivate'
// import { LayerA, LayerB } from './usageSymbol'
// import { LayerA, LayerB } from './usageAPI'
// import { LayerA, LayerB } from './usageHooks'
import { LayerA, LayerB, LayerC, LayerD } from './usageFusion'
// console.log(PropsManager)
// console.log(LayerA)

// console.log(new LayerA({ a: 1, aa: true }))
// const a = new LayerA({ a: 2, aa: false, b: 2, bb: true })
// console.log(a)

console.log('construct')
// const l = new LayerB({ a: 2, aa: false, b: 2, bb: true })
// const l = new LayerC({ a: 2, aa: false, b: 2, bb: true, c: 2, cc: true })
const l = new LayerD({ a: 2, aa: false, b: 2, bb: true, c: 2, cc: true, d: 2, dd: true })
console.log(l)

globalThis.l = l

console.log('change a')
l.setProps({ a: 3 })
console.log('change b')
l.setProps({ b: 3 })
console.log('change c')
l.setProps({ c: 3 })
console.log('change d')
l.setProps({ d: 3 })
