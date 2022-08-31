import { Mesh, Geom, Attr } from '@gs.i/frontend-sdk'

type Pos = [number, number, number?]

type Options = {
	/**
	 * 锚点，0-1
	 * [number, number]
	 */
	pivot?: number[]
}

export function buildBillboardsGeometry(positions: Pos[], options?: Options): Geom {
	const pivot = options?.pivot ?? [0.5, 0.5]
	const pivotX = pivot[0]
	const pivotY = pivot[1]

	const posTArray = new Float32Array(positions.length * 3 * 4)
	const uvTArray = new Float32Array(positions.length * 2 * 4)
	const offsetTArray = new Float32Array(positions.length * 2 * 4)
	const randomTArray = new Float32Array(positions.length * 1 * 4)

	const indexTArray = new Uint32Array(positions.length * 6)

	for (let i = 0; i < positions.length; i++) {
		const random = ran(i)
		const pos = positions[i]

		const x = pos[0]
		const y = pos[1]
		const z = pos[2] || 0

		// for (let corner = 0; corner < 4; corner++) {
		// 	posTArray[(i * 4 + corner) * 3 + 0] = x
		// 	posTArray[(i * 4 + corner) * 3 + 1] = y
		// 	posTArray[(i * 4 + corner) * 3 + 2] = z
		// }

		// B - C   1 - 2
		// | / |   | / |
		// A - D   0 - 3

		indexTArray[i * 6 + 0] = i * 4 + 0
		indexTArray[i * 6 + 1] = i * 4 + 2
		indexTArray[i * 6 + 2] = i * 4 + 1
		indexTArray[i * 6 + 3] = i * 4 + 0
		indexTArray[i * 6 + 4] = i * 4 + 3
		indexTArray[i * 6 + 5] = i * 4 + 2

		randomTArray[i * 4 + 0] = random
		randomTArray[i * 4 + 1] = random
		randomTArray[i * 4 + 2] = random
		randomTArray[i * 4 + 3] = random

		// A
		posTArray[(i * 4 + 0) * 3 + 0] = x
		posTArray[(i * 4 + 0) * 3 + 1] = y
		posTArray[(i * 4 + 0) * 3 + 2] = z

		uvTArray[(i * 4 + 0) * 2 + 0] = 0
		uvTArray[(i * 4 + 0) * 2 + 1] = 0

		offsetTArray[(i * 4 + 0) * 2 + 0] = -pivotX
		offsetTArray[(i * 4 + 0) * 2 + 1] = -pivotY

		// B
		posTArray[(i * 4 + 1) * 3 + 0] = x
		posTArray[(i * 4 + 1) * 3 + 1] = y
		posTArray[(i * 4 + 1) * 3 + 2] = z

		uvTArray[(i * 4 + 1) * 2 + 0] = 0
		uvTArray[(i * 4 + 1) * 2 + 1] = 1

		offsetTArray[(i * 4 + 1) * 2 + 0] = -pivotX
		offsetTArray[(i * 4 + 1) * 2 + 1] = 1 - pivotY

		// C
		posTArray[(i * 4 + 2) * 3 + 0] = x
		posTArray[(i * 4 + 2) * 3 + 1] = y
		posTArray[(i * 4 + 2) * 3 + 2] = z

		uvTArray[(i * 4 + 2) * 2 + 0] = 1
		uvTArray[(i * 4 + 2) * 2 + 1] = 1

		offsetTArray[(i * 4 + 2) * 2 + 0] = 1 - pivotX
		offsetTArray[(i * 4 + 2) * 2 + 1] = 1 - pivotY

		// D
		posTArray[(i * 4 + 3) * 3 + 0] = x
		posTArray[(i * 4 + 3) * 3 + 1] = y
		posTArray[(i * 4 + 3) * 3 + 2] = z

		uvTArray[(i * 4 + 3) * 2 + 0] = 1
		uvTArray[(i * 4 + 3) * 2 + 1] = 0

		offsetTArray[(i * 4 + 3) * 2 + 0] = 1 - pivotX
		offsetTArray[(i * 4 + 3) * 2 + 1] = -pivotY
	}

	const geom = new Geom({
		mode: 'TRIANGLES',
	})
	geom.attributes.position = new Attr(posTArray, 3)
	geom.attributes.position.disposable = true

	geom.attributes.uv = new Attr(uvTArray, 2)
	geom.attributes.uv.disposable = true

	geom.attributes.offset = new Attr(offsetTArray, 2)
	geom.attributes.offset.disposable = true

	geom.attributes.random = new Attr(randomTArray, 1)
	geom.attributes.random.disposable = true

	geom.indices = new Attr(indexTArray, 1)
	geom.indices.disposable = true

	return geom
}

function ran(seed: number) {
	return Math.random()
}
// function ran(seed: number) {
// 	seed *= 943766
// 	seed = (seed * 9301 + 49297) % 233280
// 	return seed / 233280.0
// }
