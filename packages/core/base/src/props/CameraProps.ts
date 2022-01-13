/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

export interface CameraProps {
	/**
	 * camera fov
	 */
	fov?: number

	/**
	 * camera zoom
	 */
	zoom?: number

	/**
	 * custom camera zoom range in [0, 23]
	 */
	zoomLimit?: Array<number>

	/**
	 * camera pitch
	 */
	pitch?: number

	/**
	 * custom camera pitch range [0, Math.PI * 0.5]
	 */
	pitchLimit?: Array<number>

	/**
	 * camera rotation
	 */
	rotation?: number

	/**
	 * camera lookat center [lng, lat]
	 */
	center?: Array<number>

	/**
	 * camera view offset
	 * see https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.setViewOffset
	 */
	viewOffset?: Array<number>

	cameraNear?: number
	cameraFar?: number

	/**
	 * 相机运动惰性
	 */
	cameraInert?: number

	/**
	 * 鼠标/触控
	 */
	cameraControl?: boolean
}

export const defaultCameraProps = {
	fov: 20,
	zoom: 14,
	zoomLimit: [1, 23],
	pitch: Math.PI * 0.25,
	pitchLimit: [0, (Math.PI * 83) / 180], // 高德地图pitchLimit
	rotation: 0,
	center: [0, 0],
	viewOffset: [0, 0],
	cameraNear: 100,
	cameraFar: 10000000000,
	/** @todo inert会导致projection在每帧绘制前同步不及时，画面会抖动 */
	cameraInert: 1.0,
	cameraControl: true,
}
