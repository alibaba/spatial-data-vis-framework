/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Polaris } from '@polaris.gl/schema'
import { smoothstep } from '@polaris.gl/utils-easing'
import { Track } from 'ani-timeline'

export type Path = {
	cameraStates: string
	duration: number
	delay?: number
	easing?: 'linear' | 'smooth'
}

export interface PathAnimationConfig {
	loop?: boolean
}

export const defaultConfig = {
	loop: false,
}

export class PathAnimation {
	polaris: Polaris
	paths: Path[]
	loop = false

	private _managerTrack: Track | undefined
	private _currPathIndex: number
	private _currTrackStopFn: { (): void } | undefined
	private _stoped = true
	private _paused = true

	constructor(polarisInstance: Polaris, config: PathAnimationConfig) {
		this.polaris = polarisInstance
		const _config = {
			...defaultConfig,
			...config,
		}
		this.loop = _config.loop
		this.paths = []
	}

	addPath(path: Path) {
		this.paths.push(path)
	}

	setPaths(paths: Path[]) {
		this.paths = paths
	}

	canPlay() {
		return this.paths.length >= 2
	}

	play() {
		if (!this.canPlay()) {
			console.warn('Polaris::PathAnimation - paths length is less than 2, cannot play animation. ')
			return
		}

		if (this._stoped) {
			this._startAnim()
			return
		}

		if (this._paused) {
			this._startAnim(true)
			return
		}
	}

	pause() {
		this._paused = true
		if (this._currTrackStopFn) {
			this._currTrackStopFn()
		}
		if (this._managerTrack) {
			this._managerTrack.alive = false
			this._managerTrack = undefined
		}
	}

	stop() {
		this._stoped = true
		if (this._currTrackStopFn) {
			this._currTrackStopFn()
		}
		if (this._managerTrack) {
			this._managerTrack.alive = false
			this._managerTrack = undefined
		}
		this._currPathIndex = 0
	}

	clear() {
		this.stop()
		this.paths = []
	}

	/**
	 * Handle the loop behavior of animations
	 */
	private _startAnim(resume = false) {
		// Recurrsion for loop animation
		const onAnimFinished = () => {
			this._stoped = true
		}

		if (resume) {
			// Start from paused index
			this._playAnims(this._currPathIndex, onAnimFinished)
		} else {
			// Start from first path
			this.polaris.setStatesCode(this.paths[0].cameraStates, 0, {
				onEnd: () => {
					this._playAnims(0, onAnimFinished)
				},
			})
		}

		if (this.loop && !this._managerTrack) {
			this._managerTrack = this.polaris.timeline.addTrack({
				id: 'PathAnimation Loop Manager',
				duration: Infinity,
				onUpdate: () => {
					if (!this._stoped) return
					this._startAnim()
				},
			})
		}

		this._stoped = false
		this._paused = false
	}

	/**
	 * The actual animation function, play from certain path index to the end.
	 * @param startIndex
	 * @param onFinished
	 * @returns
	 */
	private _playAnims(startIndex: number, onFinished?: () => void) {
		if (this._stoped) {
			return
		}

		// All path animations were completed
		if (startIndex >= this.paths.length - 1) {
			onFinished && onFinished()
			return
		}

		const pathStart = this.paths[startIndex]
		const pathNext = this.paths[startIndex + 1]
		const { duration, delay, easing } = pathStart

		let easingFn
		if (easing) {
			switch (easing) {
				case 'smooth':
					easingFn = (p) => smoothstep(0, 1, p)
					break
				// case 'quadric':
				// 	easing = undefined
				// 	break
				case 'linear':
				default:
					easingFn = (p) => p
			}
		}

		this._currTrackStopFn = this.polaris.setStatesCode(pathNext.cameraStates, duration, {
			onEnd: () => {
				this._currTrackStopFn = undefined
				if (this._stoped || this._paused) {
					return
				}
				// Using Timeline.setTimeout() to handle delay for next path
				this.polaris.timeline.setTimeout(() => {
					this._playAnims(startIndex + 1, onFinished)
				}, delay ?? 0)
			},
			easing: easingFn,
		})

		this._currPathIndex = startIndex
	}
}
