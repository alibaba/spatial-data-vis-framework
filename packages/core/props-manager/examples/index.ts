import { PropsManager } from '../src/PropsManager'

// import { LayerA, LayerB } from './usagePrivate'
// import { LayerA, LayerB } from './usageSymbol'
// import { LayerA, LayerB } from './usageAPI'
import { LayerA, LayerB } from './usageHooks'
console.log(PropsManager)
console.log(LayerA)

// console.log(new LayerA({ a: 1, aa: true }))
const b = new LayerB({ a: 2, aa: false, b: 2, bb: true })
console.log(b)

globalThis.b = b

b.setProps({ b: 3 })
b.setProps({ a: 3 })
