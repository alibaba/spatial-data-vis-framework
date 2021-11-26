/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { computeBBox, computeBSphere } from '@gs.i/utils-geometry'
/**
 * 基类。
 * 可以使用 Layer，自己添加需要的 view；
 * 也可以使用 STDLayer，添加好 threeView 和 htmlView 的 Layer，懒人福音。
 */
import { STDLayer, STDLayerProps } from '@polaris.gl/layer-std'
import { Mesh, Geom, Attr, MatrPbr } from '@gs.i/frontend-sdk'
import { Color } from '@gs.i/utils-math'
import { PolygonMatr } from './PolygonMatr'

/**
 * 内部逻辑依赖
 */
import { flattenEach } from '@turf/meta'
import { getCoords } from '@turf/invariant'
import { FeatureCollection } from '@turf/helpers'
import { getColorUint } from '../utils'

/**
 * 配置项 interface
 */
// import { THREE } from 'gl2'
export interface PolygonSideLayerProps extends STDLayerProps {
	getColor?: any
	getThickness?: any
	baseAlt?: number
	opacity?: number
	transparent?: boolean
	doubleSide?: boolean
	metallic?: number
	roughness?: number
	data?: FeatureCollection
}

/**
 * 配置项 默认值
 */
const defaultProps = {
	getColor: '#689826',
	getThickness: 0,
	baseAlt: 0,
	opacity: 1,
	transparent: false,
	doubleSide: false,
	metallic: 0.1,
	roughness: 1.0,
	data: null,
}

/**
 * 类
 */
export class PolygonSideLayer extends STDLayer {
	props: any
	geom: Geom
	matr: MatrPbr
	mesh: Mesh
	// featIndexRangeMap: Map<any, number[]>
	// featVertRangeMap: Map<any, number[]>

	constructor(props: PolygonSideLayerProps = {}) {
		const _props = {
			...defaultProps,
			...props,
		}
		super(_props)
		this.props = _props

		// this.featIndexRangeMap = new Map()
		// this.featVertRangeMap = new Map()

		this.matr = new PolygonMatr()

		this.listenProps(['opacity', 'transparent', 'doubleSide', 'metallic', 'roughness'], () => {
			this.matr.opacity = this.getProps('opacity')
			this.matr.metallicFactor = this.getProps('metallic')
			this.matr.roughnessFactor = this.getProps('roughness')
			this.matr.alphaMode = this.getProps('transparent') ? 'BLEND' : 'OPAQUE'
			this.matr.side = this.getProps('doubleSide') ? 'double' : 'front'
		})
	}

	init(projection, timeline, polaris) {
		// 3D 内容
		this.mesh = new Mesh({ name: 'PolygonSide', material: this.matr })
		this.group.add(this.mesh)

		// 数据与配置的应用（包括 reaction）
		this.listenProps(['data', 'getColor', 'getThickness', 'baseAlt'], async () => {
			this.geom = new Geom()

			const data = this.getProps('data')
			const getThickness = this.getProps('getThickness')
			const getColor = this.getProps('getColor')
			const baseAlt = this.getProps('baseAlt')

			const positions = [] as Array<number>
			const colors = [] as Array<number>
			const indices = [] as Array<number>

			if (!(data && Array.isArray(data.features))) {
				return
			}

			let offset = 0
			data.features.forEach((feature) => {
				const startOffset = offset
				// const indexRange = [indices.length, 0]
				// const vertRange = [positions.length, 0]
				let count = 0
				flattenEach(feature, (f) => {
					const rings: any[] = getCoords(f)
					for (let k = 0; k < rings.length; k++) {
						const coordinates: number[][] = rings[k]
						let canConnect = false
						for (let i = 0; i < coordinates.length; i++) {
							const lnglat = coordinates[i]
							const bottomXYZ = projection.project(lnglat[0], lnglat[1], baseAlt)
							const topXYZ = projection.project(
								lnglat[0],
								lnglat[1],
								baseAlt + getThickness(feature)
							)
							positions.push(...bottomXYZ)
							positions.push(...topXYZ)
							count += 2
							offset += 2
							if (canConnect) {
								indices.push(offset - 4, offset - 3, offset - 2)
								indices.push(offset - 2, offset - 3, offset - 1)
							}
							canConnect = true
						}
					}
				})

				const color = new Color(getColor(feature))
				const colorUint = getColorUint(color, 1.0)
				const index = startOffset * 4
				for (let i = 0; i < count; i++) {
					colors[i * 4 + 0 + index] = colorUint[0]
					colors[i * 4 + 1 + index] = colorUint[1]
					colors[i * 4 + 2 + index] = colorUint[2]
					colors[i * 4 + 3 + index] = colorUint[3]
				}

				// indexRange[1] = indices.length - 1
				// this.featIndexRangeMap.set(feature, indexRange)

				// vertRange[1] = positions.length - 1
				// this.featVertRangeMap.set(feature, vertRange)
			})

			this.geom.attributes.position = new Attr(new Float32Array(positions), 3)
			this.geom.attributes.color = new Attr(new Uint16Array(colors), 4, false, 'DYNAMIC_DRAW')
			const indicesArray = offset > 65535 ? new Uint32Array(indices) : new Uint16Array(indices)
			this.geom.indices = new Attr(indicesArray, 1)

			this.mesh.geometry = this.geom

			computeBSphere(this.geom)
			computeBBox(this.geom)
		})
	}

	// getFeatureIndexRange(feature) {
	// 	return this.featIndexRangeMap.get(feature)
	// }

	// getFeatureVertexRange(feature) {
	// 	return this.featVertRangeMap.get(feature)
	// }
}
