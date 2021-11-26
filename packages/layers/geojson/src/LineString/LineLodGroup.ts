/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Mesh } from '@gs.i/frontend-sdk'
import { CameraProxy } from 'camera-proxy'

export class LineLodGroup {
	lods: LodType[]

	constructor() {
		this.lods = []
	}

	update(cam: CameraProxy) {
		this.forEach((mesh) => (mesh.visible = false))
		const currZoom = cam.zoom
		let fittedLod: any
		this.lods.forEach((lod) => {
			if (fittedLod) {
				lod.mesh.visible = false
				return
			}
			if (currZoom < lod.zoom) {
				// Found fitted lod
				lod.mesh.visible = true
				fittedLod = lod
			}
		})
		if (!fittedLod) {
			fittedLod = this.lods[this.lods.length - 1]
			fittedLod.mesh.visible = true
		}
	}

	add(mesh: Mesh, zoom: number) {
		if (this.lods.find((l) => l.mesh === mesh)) {
			console.warn('Polaris::LineLodGroup - Mesh has already been added before, skip. ')
			return
		}
		this.lods.push({
			mesh,
			zoom,
		})
		this.sort()
		this.forEach((mesh) => (mesh.visible = false))
	}

	remove(zoomOrMesh: number | Mesh) {
		if (zoomOrMesh instanceof Mesh) {
			const lod = this.lods.find((l) => l.mesh === zoomOrMesh)
			if (lod) {
				this.lods.splice(this.lods.indexOf(lod), 1)
			}
		} else if (typeof zoomOrMesh === 'number') {
			const lod = this.lods.find((l) => l.zoom === zoomOrMesh)
			if (lod) {
				this.lods.splice(this.lods.indexOf(lod), 1)
			}
		}
	}

	get(index: number) {
		return this.lods[index]
	}

	sort() {
		// Sort lods from near to far
		this.lods.sort((a, b) => {
			return a.zoom - b.zoom
		})
	}

	forEach(fn: (mesh: Mesh, zoom: number) => void) {
		this.lods.forEach((lod) => {
			fn(lod.mesh, lod.zoom)
		})
	}

	clear() {
		this.lods.length = 0
	}
}

type LodType = {
	zoom: number
	mesh: Mesh
}
