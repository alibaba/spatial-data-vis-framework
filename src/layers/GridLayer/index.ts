/**
 * Grid Layer
 *
 * 铺在地面上的网格，用于背景装饰或者视觉辅助
 *
 * ![效果](https://img.alicdn.com/imgextra/i1/O1CN01G6WcNb1JnTipZnEIs_!!6000000001073-2-tps-926-489.png)
 *
 */
import { Mesh, UnlitMaterial } from '@gs.i/frontend-sdk'
import type * as IR from '@gs.i/schema-scene'
import { buildCircle } from '@gs.i/utils-geom-builders'
import { Color } from '@gs.i/utils-math'
//
import { specifyGeometry } from '@gs.i/utils-specify'

import { StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'
import type { Projection } from '@polaris.gl/projection'

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
	widthSegments: 100,
	/**
	 * how many segments in the vertical direction
	 * @default 100
	 */
	heightSegments: 100,

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
	centerLLA: [0, 0, 0],

	/**
	 * Grid circles
	 */
	showCircles: false,

	circleRadius: 10,

	circleSegments: 20,

	circleColor: 'green',

	circleOpacity: 1,
}

type GridLayerProps = StandardLayerProps & typeof defaultGridLayerProps

export function createGridLayer(
	props: OptionalDefault<GridLayerProps, typeof defaultGridLayerProps>
) {
	return new GridLayer(props)
}

/**
 * planar grid
 * @note grid lines do not align with lng/lat lines
 */
class GridLayer extends StandardLayer<GridLayerProps> {
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
				['width', 'height', 'widthSegments', 'heightSegments', 'lineWidth'],
				(e) => {
					if (this.getProp('fixOverlap')) {
						this.geom = generateGrid(
							this.getProp('width'),
							this.getProp('height'),
							this.getProp('widthSegments'),
							this.getProp('heightSegments'),
							this.getProp('lineWidth')
						)
					} else {
						this.geom = generateGridFast(
							this.getProp('width'),
							this.getProp('height'),
							this.getProp('widthSegments'),
							this.getProp('heightSegments'),
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
					'widthSegments',
					'heightSegments',
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
						this.getProp('widthSegments'),
						this.getProp('heightSegments'),
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
				['centerLLA'],
				(e) => {
					this.setLngLatPosition(projection)
				},
				true
			)
		})
	}

	setLngLatPosition(projection: Projection) {
		const centerLLA = this.getProp('centerLLA')
		const xyz = projection.project(centerLLA[0] ?? 0, centerLLA[1] ?? 0, centerLLA[2] ?? 0)
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
 * @param widthSegments
 * @param heightSegments
 * @param lineWidth
 * @returns
 */
function generateGridFast(
	width: number,
	height: number,
	widthSegments: number,
	heightSegments: number,
	lineWidth: number
): IR.IR.Geometry {
	const position = [] as [number, number, number][]
	const index = [] as number[][]
	// const uv = [] as [number, number][]

	const halfWidth = lineWidth / 2
	const stepWidth = width / widthSegments
	const stepHeight = height / heightSegments

	// 纵向线条
	for (let i = 1; i < widthSegments; i++) {
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
	for (let i = 1; i < heightSegments; i++) {
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
 * @param widthSegments
 * @param heightSegments
 * @param lineWidth
 * @returns
 */
function generateGrid(
	width: number,
	height: number,
	widthSegments: number,
	heightSegments: number,
	lineWidth: number
): IR.IR.Geometry {
	const position = [] as [number, number, number][]
	const index = [] as number[][]
	// const uv = [] as [number, number][]

	const halfWidth = lineWidth / 2
	const stepWidth = width / widthSegments
	const stepHeight = height / heightSegments

	// 纵向线条
	for (let i = 1; i < widthSegments; i++) {
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
	for (let j = 1; j < heightSegments; j++) {
		for (let i = 0; i < widthSegments; i++) {
			const isStart = i === 0
			const isEnd = i === widthSegments
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
	widthSegments: number,
	heightSegments: number,
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

	const stepWidth = width / widthSegments
	const stepHeight = height / heightSegments

	for (let i = 1; i < widthSegments; i++) {
		for (let j = 1; j < heightSegments; j++) {
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

type OptionalDefault<TFull extends Record<string, any>, TDefault extends TFull> = Omit<
	TFull,
	keyof TDefault
> &
	Partial<TDefault>

export { propsDesc } from './desc'
