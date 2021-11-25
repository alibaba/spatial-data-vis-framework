/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Polaris, defaultProps } from '@polaris.gl/schema'
import { Track } from 'ani-timeline'
import { easeSin0110 } from '@polaris.gl/utils-easing'

export type Callbacks = {
	onStart?: () => void
	onUpdate?: () => void
	onEnd?: () => void
}

export class CameraAnimation {
	MAX_LATITUDE = 85.051128 // Limit of Mercator Projection

	/**
	 * Polaris instance
	 * @memberof CameraAnimation
	 */
	get polaris() {
		return this._polaris
	}
	set polaris(val) {
		console.error(
			'CameraAnimation - Cannot replace polaris instance at runtime, please construct a new one. '
		)
	}
	private _polaris: Polaris

	/**
	 * Animation tracks
	 * @readonly
	 * @memberof CameraAnimation
	 */
	get tracks() {
		return this._tracks
	}
	private _tracks: Track[]

	/**
	 * Creates an instance of CameraAnimation.
	 * @param {Polaris} polarisInstance
	 * @memberof CameraAnimation
	 */
	constructor(polarisInstance: Polaris) {
		this._polaris = polarisInstance
		this._tracks = []
	}

	/**
	 *
	 *
	 * @param {number} xDir unit: m/s
	 * @param {number} yDir unit: m/s
	 * @param {*} [lnglatMin=[-180, -this.MAX_LATITUDE]]
	 * @param {*} [lnglatMax=[180, this.MAX_LATITUDE]]
	 * @param {boolean} [repeat=true]
	 * @param {Callbacks} [callbacks={}]
	 * @memberof CameraAnimation
	 */
	move(
		xDir: number,
		yDir: number,
		lnglatMin = [-180, -this.MAX_LATITUDE],
		lnglatMax = [180, this.MAX_LATITUDE],
		repeat = true,
		callbacks: Callbacks = {}
	) {
		if (xDir === undefined && yDir === undefined) {
			console.error('Polaris::enableCamAnimation - Not enough inputs: xDir, yDir')
			return
		}

		this.stop()

		const timeline = this.polaris.timeline
		const projection = this.polaris.projection
		const cameraProxy = this.polaris.cameraProxy

		const dir = {
			x: xDir ?? 0,
			y: yDir ?? 0,
		}

		lnglatMin[1] = Math.max(-this.MAX_LATITUDE, lnglatMin[1])
		lnglatMax[1] = Math.min(this.MAX_LATITUDE, lnglatMax[1])

		const { onStart, onUpdate } = callbacks

		const track = timeline.addTrack({
			startTime: timeline.currentTime,
			duration: Infinity,
			onStart: () => {
				onStart && onStart()
			},
			onUpdate: () => {
				const geoCenter = this.polaris.getGeoCenter()

				if (geoCenter[0] < lnglatMin[0]) geoCenter[0] = repeat ? lnglatMax[0] : lnglatMin[0]
				if (geoCenter[0] > lnglatMax[0]) geoCenter[0] = repeat ? lnglatMin[0] : lnglatMax[0]
				if (geoCenter[1] < lnglatMin[1]) geoCenter[1] = repeat ? lnglatMax[1] : lnglatMin[1]
				if (geoCenter[1] > lnglatMax[1]) geoCenter[1] = repeat ? lnglatMin[1] : lnglatMax[1]

				const center = projection.project(...geoCenter)
				center[0] += (dir.x / 1000) * timeline.frametime
				center[1] += (dir.y / 1000) * timeline.frametime
				cameraProxy.setCenter(center)
				onUpdate && onUpdate()
			},
		})
		this._tracks.push(track)
	}

	/**
	 *
	 *
	 * @param {number} rotationDeg
	 * @param {number} pitchDeg
	 * @param {number} [duration=10000]
	 * @param {*} [easing=undefined]
	 * @param {Callbacks} [callbacks={}]
	 * @memberof CameraAnimation
	 */
	orbitSwing(
		rotationDeg: number,
		pitchDeg: number,
		duration = 10000,
		easing: any = undefined,
		callbacks: Callbacks = {}
	) {
		if ((rotationDeg === undefined && pitchDeg === undefined) || duration === undefined) {
			console.error(
				'Polaris::enableCamAnimation - Not enough inputs: [rotationDeg, pitchDeg], duration'
			)
			return
		}

		this.stop()

		const timeline = this.polaris.timeline
		const cameraProxy = this.polaris.cameraProxy

		const rotationRadHalf = (rotationDeg ?? 0) * (Math.PI / 180) * 0.5
		const pitchRadHalf = (pitchDeg ?? 0) * (Math.PI / 180) * 0.5
		const initPitch = cameraProxy.pitch
		const initRotation = cameraProxy.rotation
		const easingFn =
			easing ??
			function (p) {
				return easeSin0110(p)
			}

		// console.log(easingFn(0), easingFn(1))

		const pitchLimit = cameraProxy.config?.limit?.pitch ?? (defaultProps.pitchLimit as number[])
		const { onStart, onUpdate } = callbacks

		const track = timeline.addTrack({
			startTime: timeline.currentTime,
			duration,
			loop: true,
			onStart: () => {
				onStart && onStart()
			},
			// easing: easingFn,
			onUpdate: (t, p) => {
				const percentage = easingFn(p)
				cameraProxy.setRotation(initRotation + percentage * rotationRadHalf)
				let pitch = initPitch - percentage * pitchRadHalf
				pitch = pitch < pitchLimit[0] ? pitchLimit[0] : pitch
				pitch = pitch > pitchLimit[1] ? pitchLimit[1] : pitch
				cameraProxy.setPitch(pitch)
				onUpdate && onUpdate()
			},
		})
		this._tracks.push(track)
	}

	/**
	 *
	 *
	 * @param {number} rotationDeg
	 * @param {number} pitchDeg
	 * @param {Callbacks} [callbacks={}]
	 * @memberof CameraAnimation
	 */
	orbitRotate(rotationDeg: number, pitchDeg: number, callbacks: Callbacks = {}) {
		if (rotationDeg === undefined && pitchDeg === undefined) {
			console.error('Polaris::enableCamAnimation - Not enough inputs: rotationDeg, pitchDeg')
			return
		}

		this.stop()

		const timeline = this.polaris.timeline
		const cameraProxy = this.polaris.cameraProxy

		const rotationRad = (rotationDeg ?? 0) * (Math.PI / 180)
		const pitchRad = (pitchDeg ?? 0) * (Math.PI / 180)
		const pitchLimit = cameraProxy.config?.limit?.pitch ?? (defaultProps.pitchLimit as number[])
		const { onStart, onUpdate } = callbacks

		const track = timeline.addTrack({
			startTime: timeline.currentTime,
			duration: Infinity,
			onStart: () => {
				onStart && onStart()
			},
			onUpdate: () => {
				const pitchSpeed = (pitchRad / 1000) * timeline.frametime
				let pitch = cameraProxy.pitch - pitchSpeed
				pitch = pitch < pitchLimit[0] ? pitchLimit[1] : pitch
				pitch = pitch > pitchLimit[1] ? pitchLimit[0] : pitch
				const rotSpeed = (rotationRad / 1000) * timeline.frametime
				cameraProxy.setRotation(cameraProxy.rotation + rotSpeed)
				cameraProxy.setPitch(pitch)
				onUpdate && onUpdate()
			},
		})
		this._tracks.push(track)
	}

	/**
	 * Stop any alive animation tracks
	 *
	 * @memberof CameraAnimation
	 */
	stop() {
		this._tracks.forEach((track) => (track.alive = false))
		this._tracks.length = 0
	}
}
