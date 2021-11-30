/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Mesh } from '@gs.i/frontend-sdk'
import { STDLayer, STDLayerProps } from '@polaris.gl/layer-std'
import { deepCloneMesh } from '@polaris.gl/utils'
import { Marker } from './Marker'
import { PolarisGSI } from '@polaris.gl/gsi'
import { CoordV2, PickEvent } from '@polaris.gl/schema'

/**
 * 配置项 interface
 */
export interface MarkerLayerProps extends STDLayerProps {
	data?: any[]
	lng?: number
	lat?: number
	alt?: number
	offsetX?: number
	offsetY?: number
	html?: HTMLElement | string | null
	style?: { [key: string]: string }
	object3d?: Mesh | null
	autoHide?: boolean
	/**
	 * enables high performance mode will reduce the calculation of marker.worldMatrix
	 * which may cause position/screenXY updating lag (a bit)
	 */
	highPerfMode?: boolean
}

/**
 * 配置项 默认值
 */
export const defaultProps: MarkerLayerProps = {
	alt: 0,
	html: null,
	offsetX: 0,
	offsetY: 0,
	object3d: null,
	autoHide: false,
	highPerfMode: false,
}

/**
 * Markerayer，在地图上放置多个三维和二维Marker，实现数据的实时更新和刷新
 * data数据结构
 * [{
 *     lnglat: [], alt, html, object3d,
 *     ...OtherLayerProps都可单独设置
 * }]
 */
export class MarkerLayer extends STDLayer {
	props: any

	private markers: Marker[]

	constructor(props: MarkerLayerProps = {}) {
		const config = {
			...defaultProps,
			...props,
		}
		super(config)

		this.props = config
		this.markers = []

		this.name = this.group.name = 'MakerLayer'
		this.element.className = 'maker-layer'
	}

	init(projection) {
		const listenProps = Object.keys(defaultProps).filter((k) => k !== 'data')
		this.listenProps(listenProps, (event) => {
			const updateProps = {}
			event.type.split(',').forEach((key) => {
				updateProps[key] = this.getProps(key)
			})

			this.markers.forEach((marker) => {
				if (marker) marker.updateProps(updateProps)
			})
		})

		/**
		 * 数据结构
		 * data: [{
		 *     lnglat: [], alt, html, object3d,
		 *     ...Other MarkerLayerProps 都可单独设置
		 * }]
		 */
		this.listenProps('data', () => {
			const data = this.getProps('data')
			if (!data) return
			this.updateMarkers(data)
		})

		// Handle picking event
		this.onClick = this.onHover = (polaris, canvasCoord, ndc) => {
			if (!this.getProps('pickable')) return
			const data = this.getProps('data')
			const results: PickEvent[] = []
			for (let i = 0; i < this.markers.length; i++) {
				const marker = this.markers[i]
				const result = this._pickMarker(polaris as PolarisGSI, canvasCoord, ndc, marker, i)
				if (result) {
					const pickEvent = {
						...result,
						index: i,
						data: data ? data[i] : undefined,
					}
					results.push(pickEvent)
				}
			}
			results.sort((a, b) => a.distance - b.distance)
			return results[0]
		}
	}

	updateMarkers(data: any[]) {
		// Remove old markers
		this.markers.forEach((marker) => {
			this.remove(marker)
		})
		this.markers.length = 0

		for (let i = 0; i < data.length; i++) {
			const markerProps = data[i]

			// Handle lnglat => lng,lat
			markerProps.lng = markerProps.lng ?? markerProps.lnglat[0]
			markerProps.lat = markerProps.lat ?? markerProps.lnglat[1]
			delete markerProps.lnglat

			// Handle html & object3d props
			if (!markerProps.html && this.getProps('html')) {
				if (this.getProps('html') instanceof HTMLElement) {
					markerProps.html = this.getProps('html').cloneNode()
				} else {
					markerProps.html = this.getProps('html')
				}
			}
			if (!markerProps.style && this.getProps('style')) {
				markerProps.style = this.getProps('style')
			}
			if (!markerProps.object3d && this.getProps('object3d')) {
				markerProps.object3d = deepCloneMesh(this.getProps('object3d'))
			}

			const marker = new Marker({
				...this.props,
				...markerProps,
				pickable: this.getProps('pickable'),
			})

			this.add(marker)
			this.markers.push(marker)
		}
	}

	show(duration = 1000) {
		this.markers.forEach((marker) => {
			marker.show(duration)
		})
	}

	hide(duration = 1000) {
		this.markers.forEach((marker) => {
			marker.hide(duration)
		})
	}

	private _pickMarker(
		polaris: PolarisGSI,
		canvasCoords: CoordV2,
		ndc: CoordV2,
		marker: Marker,
		dataIndex: number
	): PickEvent | undefined {
		const data = this.getProps('data')
		if (!data || data.length === 0) return

		const pickResult = marker.pick(polaris, canvasCoords, ndc)
		if (!pickResult) return

		pickResult.index = dataIndex
		pickResult.data = data[dataIndex]
		return pickResult
	}
}
