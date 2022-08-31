/**
 * Grid Layer
 *
 * 铺在地面上的网格，用于背景装饰或者视觉辅助
 *
 * ![效果](https://img.alicdn.com/imgextra/i1/O1CN01G6WcNb1JnTipZnEIs_!!6000000001073-2-tps-926-489.png)
 *
 */

import { StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'
import * as IR from '@gs.i/schema-scene'
import { specifyGeometry, specifyAttribute } from '@gs.i/utils-specify'
import { UnlitMaterial, Mesh, Attr } from '@gs.i/frontend-sdk'
import { buildCircle } from '@gs.i/utils-geom-builders'

//
import { Color } from '@gs.i/utils-math'
import type { Projection } from '@polaris.gl/projection'

const R = 6378137

const defaultGridLayerProps = {
	/**
	 * width of the grid
	 * @unit meter
	 * @default 100000
	 */
	width: 100000,
	/**
	 * height of the grid
	 * @unit meter
	 * @default 100000
	 */
	height: 100000,
	/**
	 * how many segments in the horizontal direction
	 * @default 100
	 */
	segmentWidth: 100,
	/**
	 * how many segments in the vertical direction
	 * @default 100
	 */
	segmentHeight: 100,

	/**
	 * lineWidth
	 * @unit meter
	 * @default 10
	 */
	lineWidth: 10,

	/**
	 * whether to fix overlapping fragments
	 *
	 * @note this will add overhead but opacity will be correct
	 */
	fixOverlap: true,

	color: 'red',
	opacity: 1,

	/**
	 * the center of grids
	 */
	lnglatalt: [0, 0, 0],

	/**
	 * Grid circles
	 */
	showCircles: false,

	circleRadius: 10,

	circleSegments: 20,

	circleColor: 'green',

	circleOpacity: 1,
}

export type GridLayerProps = StandardLayerProps & typeof defaultGridLayerProps

/**
 * planar grid
 * @note grid lines do not align with lng/lat lines
 */
export class GridLayer extends StandardLayer<GridLayerProps> {
	matr = new UnlitMaterial({ alphaMode: 'OPAQUE' })
	geom: IR.Geometry
	mesh: Mesh

	circleMatr = new UnlitMaterial({ alphaMode: 'BLEND' })
	circleGeom: IR.Geometry
	circleMesh: Mesh

	constructor(props: OptionalDefault<GridLayerProps, typeof defaultGridLayerProps>) {
		super({ ...defaultGridLayerProps, ...props })

		// debugger
		this.addEventListener('init', (e) => {
			const projection = e.projection

			this.watchProps(
				['color', 'opacity'],
				(e) => {
					this.matr.baseColorFactor = new Color(this.getProp('color'))
					this.matr.opacity = this.getProp('opacity')
				},
				true
			)

			// construct geometry
			this.watchProps(
				['width', 'height', 'segmentWidth', 'segmentHeight', 'lineWidth'],
				(e) => {
					if (this.getProp('fixOverlap')) {
						this.geom = generateGrid(
							this.getProp('width'),
							this.getProp('height'),
							this.getProp('segmentWidth'),
							this.getProp('segmentHeight'),
							this.getProp('lineWidth')
						)
					} else {
						this.geom = generateGridFast(
							this.getProp('width'),
							this.getProp('height'),
							this.getProp('segmentWidth'),
							this.getProp('segmentHeight'),
							this.getProp('lineWidth')
						)
					}

					if (this.mesh) this.group.remove(this.mesh)

					this.mesh = new Mesh({ name: 'grids', material: this.matr, geometry: this.geom })
					this.group.add(this.mesh)
				},
				true
			)

			this.watchProps(
				['circleColor', 'circleOpacity'],
				(e) => {
					this.circleMatr.baseColorFactor = new Color(this.getProp('circleColor'))
					this.circleMatr.opacity = this.getProp('circleOpacity')
				},
				true
			)

			// construct geometry
			this.watchProps(
				[
					'width',
					'height',
					'segmentWidth',
					'segmentHeight',
					'showCircles',
					'circleRadius',
					'circleSegments',
				],
				(e) => {
					if (!this.getProp('showCircles')) {
						if (this.circleMesh) {
							this.group.remove(this.circleMesh)
						}
						return
					}

					this.circleGeom = generateCircles(
						this.getProp('width'),
						this.getProp('height'),
						this.getProp('segmentWidth'),
						this.getProp('segmentHeight'),
						this.getProp('circleRadius'),
						this.getProp('circleSegments')
					)

					this.circleMesh = new Mesh({
						name: 'circles',
						material: this.circleMatr,
						geometry: this.circleGeom,
					})
					this.group.add(this.circleMesh)
				},
				true
			)

			this.watchProps(
				['lnglatalt'],
				(e) => {
					this.setLngLatPosition(projection)
				},
				true
			)
		})
	}

	setLngLatPosition(projection: Projection) {
		const lnglatalt = this.getProp('lnglatalt')
		const xyz = projection.project(lnglatalt[0] ?? 0, lnglatalt[1] ?? 0, lnglatalt[2] ?? 0)
		this.group.transform.position.set(...xyz)
		this.group.transform.version++
	}
}

/**
 * simpler version, do not fix overlap, add a little z-gap
 *
 * ![](https://img.alicdn.com/imgextra/i3/O1CN01TzF1PO1RFbLjEIbwI_!!6000000002082-2-tps-965-482.png)
 *
 * @param width
 * @param height
 * @param segmentWidth
 * @param segmentHeight
 * @param lineWidth
 * @returns
 */
function generateGridFast(
	width: number,
	height: number,
	segmentWidth: number,
	segmentHeight: number,
	lineWidth: number
): IR.IR.Geometry {
	const position = [] as [number, number, number][]
	const index = [] as number[][]
	// const uv = [] as [number, number][]

	const halfWidth = lineWidth / 2
	const stepWidth = width / segmentWidth
	const stepHeight = height / segmentHeight

	// 纵向线条
	for (let i = 1; i < segmentWidth; i++) {
		const centerX = stepWidth * i
		// 左上 x,y,z
		const idxLT = position.push([centerX - halfWidth, height, 0]) - 1
		// uv.push([(centerX - halfWidth) / width, 1])
		// 右上
		const idxRT = position.push([centerX + halfWidth, height, 0]) - 1
		// uv.push([(centerX + halfWidth) / width, 1])
		// 左下
		const idxLB = position.push([centerX - halfWidth, 0, 0]) - 1
		// uv.push([(centerX - halfWidth) / width, 0])
		// 右下
		const idxRB = position.push([centerX + halfWidth, 0, 0]) - 1
		// uv.push([(centerX + halfWidth) / width, 0])

		index.push([idxLT, idxLB, idxRB, idxRT, idxLT, idxRB])
	}

	// 横向
	for (let i = 1; i < segmentHeight; i++) {
		const centerY = stepHeight * i
		// 左上 x,y,z
		const idxLT = position.push([0, centerY + halfWidth, -0.3]) - 1
		// uv.push([0, (centerY + halfWidth) / width])
		// 右上
		const idxRT = position.push([width, centerY + halfWidth, -0.3]) - 1
		// uv.push([1, (centerY + halfWidth) / width])
		// 左下
		const idxLB = position.push([0, centerY - halfWidth, -0.3]) - 1
		// uv.push([0, (centerY - halfWidth) / width])
		// 右下
		const idxRB = position.push([width, centerY - halfWidth, -0.3]) - 1
		// uv.push([1, (centerY - halfWidth) / width])

		index.push([idxLT, idxLB, idxRB, idxRT, idxLT, idxRB])
	}

	// 居中
	position.forEach((pos) => {
		pos[0] -= width / 2
		pos[1] -= height / 2
	})

	const geom = specifyGeometry({
		mode: 'TRIANGLES',
		attributes: {
			position: {
				array: new Float32Array(position.flat()),
				itemSize: 3,
			},
		},
		indices: {
			array: new Uint32Array(index.flat()),
			itemSize: 1,
		},
	})

	return geom
}

/**
 * fix overlap
 *
 * ![](https://img.alicdn.com/imgextra/i1/O1CN01G6WcNb1JnTipZnEIs_!!6000000001073-2-tps-926-489.png)
 *
 * @param width
 * @param height
 * @param segmentWidth
 * @param segmentHeight
 * @param lineWidth
 * @returns
 */
function generateGrid(
	width: number,
	height: number,
	segmentWidth: number,
	segmentHeight: number,
	lineWidth: number
): IR.IR.Geometry {
	const position = [] as [number, number, number][]
	const index = [] as number[][]
	// const uv = [] as [number, number][]

	const halfWidth = lineWidth / 2
	const stepWidth = width / segmentWidth
	const stepHeight = height / segmentHeight

	// 纵向线条
	for (let i = 1; i < segmentWidth; i++) {
		const centerX = stepWidth * i
		// 左上 x,y,z
		const idxLT = position.push([centerX - halfWidth, height, 0]) - 1
		// uv.push([(centerX - halfWidth) / width, 1])
		// 右上
		const idxRT = position.push([centerX + halfWidth, height, 0]) - 1
		// uv.push([(centerX + halfWidth) / width, 1])
		// 左下
		const idxLB = position.push([centerX - halfWidth, 0, 0]) - 1
		// uv.push([(centerX - halfWidth) / width, 0])
		// 右下
		const idxRB = position.push([centerX + halfWidth, 0, 0]) - 1
		// uv.push([(centerX + halfWidth) / width, 0])

		index.push([idxLT, idxLB, idxRB, idxRT, idxLT, idxRB])
	}

	// 横向
	for (let j = 1; j < segmentHeight; j++) {
		for (let i = 0; i < segmentWidth; i++) {
			const isStart = i === 0
			const isEnd = i === segmentWidth
			const centerX = stepWidth * i
			const centerY = stepHeight * j
			// 左上 x,y,z
			const idxLT =
				position.push([isStart ? centerX : centerX + halfWidth, centerY + halfWidth, 0]) - 1
			// uv.push([0, (centerY + halfWidth) / width])
			// 右上
			const idxRT =
				position.push([
					isEnd ? centerX + stepWidth : centerX + stepWidth - halfWidth,
					centerY + halfWidth,
					0,
				]) - 1
			// uv.push([1, (centerY + halfWidth) / width])
			// 左下
			const idxLB =
				position.push([isStart ? centerX : centerX + halfWidth, centerY - halfWidth, 0]) - 1
			// uv.push([0, (centerY - halfWidth) / width])
			// 右下
			const idxRB =
				position.push([
					isEnd ? centerX + stepWidth : centerX + stepWidth - halfWidth,
					centerY - halfWidth,
					0,
				]) - 1
			// uv.push([1, (centerY - halfWidth) / width])

			index.push([idxLT, idxLB, idxRB, idxRT, idxLT, idxRB])
		}
	}

	// 居中
	position.forEach((pos) => {
		pos[0] -= width / 2
		pos[1] -= height / 2
	})

	const geom = specifyGeometry({
		mode: 'TRIANGLES',
		attributes: {
			position: {
				array: new Float32Array(position.flat()),
				itemSize: 3,
			},
		},
		indices: {
			array: new Uint32Array(index.flat()),
			itemSize: 1,
		},
	})

	return geom
}

/**
 * @todo
 */
function generateCircles(
	width: number,
	height: number,
	segmentWidth: number,
	segmentHeight: number,
	radius: number,
	segments: number
) {
	const circle = buildCircle({ radius, segments, normal: false, uv: false })
	const pos = circle.attributes.position as IR.Attribute
	const idx = circle.indices as IR.Attribute
	const originPos = pos.array as IR.TypedArray
	const originIdx = idx.array as IR.TypedArray

	const positions: number[] = []
	const indices: number[] = []

	const stepWidth = width / segmentWidth
	const stepHeight = height / segmentHeight

	for (let i = 1; i < segmentWidth; i++) {
		for (let j = 1; j < segmentHeight; j++) {
			const centerX = stepWidth * i
			const centerY = stepHeight * j

			// store current vertex count
			const vertexOffset = positions.length / 3

			// positions
			for (let k = 0; k < originPos.length; k += 3) {
				const x = originPos[k + 0] + centerX
				const y = originPos[k + 1] + centerY
				const z = originPos[k + 2]
				positions.push(x, y, z)
			}

			// indices
			for (let k = 0; k < originIdx.length; k++) {
				indices.push(originIdx[k] + vertexOffset)
			}
		}
	}

	// 居中
	for (let k = 0; k < positions.length; k += 3) {
		positions[k + 0] -= width / 2
		positions[k + 1] -= height / 2
	}

	const geom = specifyGeometry({
		mode: 'TRIANGLES',
		attributes: {
			position: {
				array: new Float32Array(positions),
				itemSize: 3,
			},
		},
		indices: {
			array: new Uint32Array(indices),
			itemSize: 1,
		},
	})

	return geom
}

export type OptionalDefault<TFull extends Record<string, any>, TDefault extends TFull> = Omit<
	TFull,
	keyof TDefault
> &
	Partial<TDefault>
