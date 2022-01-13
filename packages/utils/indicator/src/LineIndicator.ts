/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { StandardLayer } from '@polaris.gl/layer-std'
import { Color } from '@gs.i/utils-math'
import { GLine, DefaultGLineConfig } from '@gs.i/utils-gline'
import { isDISPOSED } from '@gs.i/schema'

export const defaultGLineConfig = {
	level: 2,
	opacity: 1.0,
	lineWidth: 2,
	useColors: true,
	resolution: { x: 500, y: 500 },
	usePerspective: false,
	dynamic: true,
	depthTest: true,
	u: false,
	texture: undefined,
}

export interface Config {
	defaultColor: Color
	defaultAlpha: number
	highlightColor: Color
	highlightAlpha: number
}

/**
 * 为Layer快速创建可变换高亮、还原高亮等操作的边线显示工具
 *
 * @export
 * @class LineIndicator
 */
export class LineIndicator {
	layer?: StandardLayer
	gline: GLine
	config: Config
	private _rawPositions: number[][]

	constructor(linePositions: number[][], glineConfig: DefaultGLineConfig, indicatorConfig: Config) {
		const _config = {
			...defaultGLineConfig,
			...glineConfig,
		}

		this.gline = new GLine(_config)
		this.config = indicatorConfig
		this._rawPositions = linePositions

		// 初始化gline geom
		const colorsArr: number[][] = []
		const r = this.config.defaultColor.r
		const g = this.config.defaultColor.g
		const b = this.config.defaultColor.b
		const a = this.config.defaultAlpha

		linePositions.forEach((position) => {
			const colors: number[] = []
			const l = position.length / 3
			for (let i = 0; i < l; i++) {
				colors.push(r, g, b, a)
			}
			colorsArr.push(colors)
		})

		this.gline.geometry.updateData({
			positions: linePositions,
			colors: colorsArr,
		})

		// Delete u attr which is unnecessary in this class
		delete this.gline.geometry.attributes.u
	}

	updateResolution(width, height) {
		this.gline.material.config.resolution = { x: width, y: height }
	}

	clearUpdateRanges() {
		const lineColorAttr = this.gline.geometry.attributes.color
		if (lineColorAttr.commitedVersion === lineColorAttr.version) {
			lineColorAttr.updateRanges = []
		}
	}

	updateHighlightByOffsetCount(offset: number, count: number) {
		const colors: number[] = []
		const r = this.config.highlightColor.r
		const g = this.config.highlightColor.g
		const b = this.config.highlightColor.b
		const a = this.config.highlightAlpha
		for (let i = 0; i < count; i++) {
			colors.push(r, g, b, a)
		}
		this.gline.geometry.updateSubData(
			{
				colors,
			},
			offset,
			count
		)
	}

	updateHighlightByIndex(index: number) {
		let offset = 0
		for (let i = 0; i < this._rawPositions.length; i++) {
			if (i >= index) break
			const posData = this._rawPositions[i]
			offset += posData.length / 3
		}
		const count = this._rawPositions[index].length / 3
		return this.updateHighlightByOffsetCount(offset, count)
	}

	restoreHighlightByOffsetCount(offset: number, count: number) {
		const colors: number[] = []
		const r = this.config.defaultColor.r
		const g = this.config.defaultColor.g
		const b = this.config.defaultColor.b
		const a = this.config.defaultAlpha
		for (let i = 0; i < count; i++) {
			colors.push(r, g, b, a)
		}
		this.gline.geometry.updateSubData(
			{
				colors,
			},
			offset,
			count
		)
	}

	restoreHighlightByIndex(index: number) {
		let offset = 0
		for (let i = 0; i < this._rawPositions.length; i++) {
			if (i >= index) break
			const posData = this._rawPositions[i]
			offset += posData.length / 3
		}
		const count = this._rawPositions[index].length / 3
		return this.restoreHighlightByOffsetCount(offset, count)
	}

	restoreDefaultColorAll() {
		const attr = this.gline.geometry.attributes.color
		const colors = attr.array

		if (isDISPOSED(colors)) return

		// updateRanges restoring
		this.clearUpdateRanges()

		// Color buffer restoring
		const r = this.config.defaultColor.r
		const g = this.config.defaultColor.g
		const b = this.config.defaultColor.b
		const a = this.config.defaultAlpha
		let start = Infinity
		let end = -Infinity
		for (let i = 0; i < colors.length; i += 4) {
			if (
				colors[i + 0] !== r ||
				colors[i + 1] !== g ||
				colors[i + 2] !== b ||
				colors[i + 3] !== a
			) {
				colors[i + 0] = r
				colors[i + 1] = g
				colors[i + 2] = b
				colors[i + 3] = a
				start = Math.min(start, i)
				end = Math.max(end, i + 3)
			}
		}
		if (start - end === Infinity) return
		attr.updateRanges = attr.updateRanges ?? []
		attr.updateRanges.push({
			start: start,
			count: end - start,
		})
		attr.version++
	}

	addToLayer(layer: StandardLayer) {
		if (!layer.group.children.has(this.gline)) {
			layer.group.add(this.gline)
		} else {
			console.warn('Polaris::LineIndicator - Try to add LineIndicator to same layer twice. ')
		}
		this.layer = layer
	}

	removeFromLayer() {
		if (this.layer) {
			this.layer.group.remove(this.gline)
			this.layer = undefined
		} else {
			// console.warn('Polaris::LineIndicator - LineIndicator has not been added to any layer. ')
		}
	}
}
