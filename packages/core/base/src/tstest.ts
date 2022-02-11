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

//
export const a = 0
