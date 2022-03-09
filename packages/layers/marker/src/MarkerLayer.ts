/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Mesh } from '@gs.i/frontend-sdk'
import { deepCloneMesh } from './utils'
import { Marker } from './Marker'
import { PolarisGSI, StandardLayer, StandardLayerProps } from '@polaris.gl/base-gsi'
import { CoordV2, PickEvent } from '@polaris.gl/base'

/**
 * 配置项 interface
 */
export interface MarkerLayerProps extends StandardLayerProps {
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
	name: 'MakerLayer',
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
export class MarkerLayer extends StandardLayer<MarkerLayerProps> {
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

		this.element.className = 'maker-layer'
	}

	init(projection) {
		const watchProps = [
			'alt',
			'html',
			'offsetX',
			'offsetY',
			'object3d',
			'autoHide',
			'highPerfMode',
		] as const
		this.watchProps(
			watchProps,
			(event) => {
				const updateProps = {}
				event.changedKeys.forEach((key) => {
					updateProps[key] = this.getProp(key)
				})

				this.markers.forEach((marker) => {
					if (marker) marker.updateProps(updateProps)
				})
			},
			{ immediate: true }
		)

		/**
		 * 数据结构
		 * data: [{
		 *     lnglat: [], alt, html, object3d,
		 *     ...Other MarkerLayerProps 都可单独设置
		 * }]
		 */
		this.watchProp(
			'data',
			() => {
				const data = this.getProp('data')
				if (!data) return
				this.updateMarkers(data)
			},
			{ immediate: true }
		)
	}

	raycast(polaris, canvasCoord, ndc) {
		if (!this.getProp('pickable')) return
		const data = this.getProp('data')
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

	updateMarkers(data: any[]) {
		// Remove old markers
		this.markers.forEach((marker) => {
			this.remove(marker as any) // todo: marker should not be layer
		})
		this.markers.length = 0

		for (let i = 0; i < data.length; i++) {
			const markerProps = data[i]

			// Handle lnglat => lng,lat
			markerProps.lng = markerProps.lng ?? markerProps.lnglat[0]
			markerProps.lat = markerProps.lat ?? markerProps.lnglat[1]
			delete markerProps.lnglat

			// Handle html & object3d props
			const html = this.getProp('html')
			if (!markerProps.html && html) {
				if (html instanceof HTMLElement) {
					markerProps.html = html.cloneNode()
				} else {
					markerProps.html = html
				}
			}
			if (!markerProps.style && this.getProp('style')) {
				markerProps.style = this.getProp('style')
			}
			const object3d = this.getProp('object3d')
			if (!markerProps.object3d && object3d) {
				markerProps.object3d = deepCloneMesh(object3d)
			}

			const marker = new Marker({
				...this.props,
				...markerProps,
				pickable: this.getProp('pickable'),
			})

			this.add(marker as any) // todo: marker should not be layer
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
		const data = this.getProp('data')
		if (!data || data.length === 0) return

		const pickResult = marker.pick(polaris, canvasCoords, ndc)
		if (!pickResult) return

		pickResult.index = dataIndex
		pickResult.data = data[dataIndex]
		return pickResult
	}
}
