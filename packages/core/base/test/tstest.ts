/**
 * Test interface in different ts backends
 */

/**
 * base class A
 */
abstract class A<TA extends Record<string, any> = Record<string, never>> {
	a: TA
	getA<TAKey extends keyof TA>(key: TAKey): TA[TAKey] {
		return this.a[key]
	}
	getThis(): this {
		return this
	}
	setThis(t: this) {
		// return this
		return this.a
	}
}

/**
 * base class B
 */
abstract class B<TB extends Record<string, any> = Record<string, never>> {
	b: TB
	getB<TBKey extends keyof TB>(key: TBKey): TB[TBKey] {
		return this.b[key]
	}
	getThis(): this {
		return this
	}
	setThis(t: this) {
		// return this
		return this.b
	}
}

//

interface PropsC {
	pc: number
}

/**
 * middle class C
 */
class C<TC extends PropsC = PropsC> extends A<TC> {
	c: TC
	getC<TCKey extends keyof TC>(key: TCKey): TC[TCKey] {
		return this.c[key]
	}
	getThis(): this {
		return this
	}
	setThis(t: this) {
		// return this
		return this.c
	}
}

//

interface PropsD extends PropsC {
	pd: number
}

/**
 * middle class D
 */
class D<TD extends PropsD = PropsD> extends C<TD> {
	d: TD
	getD<TDKey extends keyof TD>(key: TDKey): TD[TDKey] {
		return this.c[key]
	}
	getThis(): this {
		return this
	}
	setThis(t: this) {
		// return this
		return this.c
	}

	_() {
		this.getC('pd')
	}
}

//

interface PropsE extends PropsD {
	pe: number
}

/**
 * final class E
 */
class E<TE extends PropsE = PropsE> extends D<TE> {
	e: TE
	getD<TEKey extends keyof TE>(key: TEKey): TE[TEKey] {
		return this.e[key]
	}
	getThis(): this {
		return this
	}
	setThis(t: this) {
		// return this
		return this.e
	}

	_() {
		this.getC('pd')
	}
}

//

const e = new E()

e.getD('pc')

const _32 = e.getThis()

class H {
	ss: { a: { r: number } }

	getSS(): this['ss'] {
		return this.ss
	}
}

class M extends H {
	declare ss: {
		a: { r: number; s: boolean }
		b: boolean
	}
}

const m = new M()
const ss = m.getSS()

// class L extends M {
// 	declare ss: {
// 		a: { r: number }
// 		b: boolean
// 	}
// }

//
export const a = 0

abstract class N {
	abstract aa(p: number): void

	bb: (p: number) => void

	set onCC(v: (p: number) => void) {}
}

class O extends N {
	aa(p) {}

	bb = (p) => {}

	constructor() {
		super()
		this.onCC = (p) => {}
	}
}

interface BasicProps {
	foo: number
}
class P<T extends BasicProps> {
	a(props: T) {
		this.b(props)
	}
	b(props: BasicProps) {
		this.a(props)
	}

	c(props: Partial<T>) {
		this.d(props)
	}
	d(props: BasicProps) {
		this.c(props)
	}
}

interface PropsQ {
	foo: number
}
class Q<TProps extends PropsQ> {
	props: Partial<TProps>
	constructor(p: TProps) {
		this.props = p
		console.log(p.foo)
	}

	a(p: Partial<TProps>) {}
}

interface PropsR extends PropsQ {
	bar: number
}
class R<TProps extends PropsR> extends Q<TProps> {
	props: Partial<TProps>
	constructor(p: TProps) {
		super(p)
		this.props = p
		console.log(p.bar)

		this.a({ foo: 1 })
		this.a({ bar: 1 })
	}
}

class S<T extends { foo: number }> {
	method() {
		// const a: T = {}
		// const a: T = {foo: 1}
		const a: Partial<T | { foo: number }> = { foo: 1 }
		// const a: Partial<T | { foo: number }> = { bar: 1 }
		// const a: Partial<T> = {}
		// const a = { foo: 1 } as T
		const b = {} as T
		b.foo = 1
	}
}

// new R({})

// type AA = { l: true; m: true }
type AA = Partial<{ l: true; m: true }>
// type AA = Partial<{ l: true; m: true }> & Record<string, any>
// type AA<T extends { l: true; m: true }> = Partial<T>
// const aa: AA = { l: false }
const aa: AA = { n: true }
// const aa: AA<any> = { n: true }

type BB = { l: true }

console.log(aa)

function isBoolean(s: boolean) {}

{
	class A<T extends { s: boolean }> {
		t1: T
		t2: Partial<T>
		t3: Partial<T | { s: boolean }>

		set() {
			this.t1 = { s: true } // TS Error
			this.t2 = { s: true } // TS Error
			this.t3 = { s: true } // TS Pass
			this.t3 = { l: true } // TS Error

			this.t1.s // boolean
			this.t2.s // boolean | undefined
			this.t3.s // boolean | undefined
		}
	}

	class B extends A<{ l: boolean; s: boolean }> {
		set() {
			this.t1 = { s: true } // TS Error
			this.t2 = { s: true } // TS Pass
			this.t3 = { s: true } // TS Pass
			this.t3 = { l: true } // TS Pass
		}
	}
}
{
	class A<T> {
		t1: T & { s: boolean }
		t2: Partial<T & { s: boolean }>
		t3: Partial<T | { s: boolean }>

		t4: Partial<T> & Partial<{ s: boolean }>
		t5: Partial<T> | Partial<{ s: boolean }>

		set() {
			this.t1 = { s: true } // TS Error
			this.t2 = { s: true } // TS Error
			this.t3 = { s: true } // TS Pass
			this.t3 = { l: true } // TS Error

			this.t4 = { s: true } // TS Error
			this.t5 = { s: true } // TS Pass
		}
	}

	class B extends A<{ l: boolean }> {
		set() {
			this.t1 = { s: true } // TS Error
			this.t2 = { s: true } // TS Pass
			this.t3 = { s: true } // TS Pass
			this.t3 = { l: true } // TS Pass
		}
	}
}
