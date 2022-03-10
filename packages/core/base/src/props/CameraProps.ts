/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

export const defaultCameraProps = {
	/**
	 * camera fov
	 */
	fov: 20,
	/**
	 * camera zoom
	 */
	zoom: 14,
	/**
	 * custom camera zoom range in [0, 23]
	 */
	zoomLimit: [1, 23],
	/**
	 * camera pitch
	 */
	pitch: Math.PI * 0.25,
	/**
	 * custom camera pitch range [0, Math.PI * 0.5]
	 */
	pitchLimit: [0, (Math.PI * 83) / 180], // 高德地图pitchLimit

	/**
	 * camera rotation
	 */
	rotation: 0,
	/**
	 * camera lookat center [lng, lat]
	 */
	center: [0, 0],
	/**
	 * camera view offset
	 * see https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.setViewOffset
	 */
	viewOffset: [0, 0],
	cameraNear: 100,
	cameraFar: 10000000000,
	/**
	 * 相机运动惰性
	 *
	 * @todo inert会导致projection在每帧绘制前同步不及时，画面会抖动
	 */
	cameraInert: 1.0,

	/**
	 * 鼠标/触控
	 */
	cameraControl: true,
}

export type CameraProps = Partial<typeof defaultCameraProps>
