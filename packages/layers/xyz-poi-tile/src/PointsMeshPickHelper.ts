import { Vector3, Matrix4, Box2, Vector2 } from '@gs.i/utils-math'
import { RenderableNode, isDISPOSED } from '@gs.i/schema-scene'
import { CoordV2, PickInfo } from '@polaris.gl/base'
import { PolarisGSI } from '@polaris.gl/gsi'

// const div = document.createElement('div')
// div.style.position = 'absolute'
// div.style.border = '1px solid red'
// document.body.appendChild(div)

export class PointsMeshPickHelper {
	mesh: RenderableNode
	polaris: any
	sizeAttrName: string
	offset: readonly [number, number]

	private _imgAlphaData: Uint8Array
	private _imgWidth: number
	private _imgHeight: number
	private _worldMatrix = new Matrix4()
	private _position = new Vector3()
	private _vec3 = new Vector3()
	private _pointBox = new Box2()
	private _uv = new Vector2()

	constructor(
		mesh: RenderableNode,
		img: string | HTMLImageElement,
		polaris: any,
		sizeAttrName: string,
		offset = [0.0, 0.0] as readonly [number, number]
	) {
		this.mesh = mesh
		this.polaris = polaris
		this.sizeAttrName = sizeAttrName
		this.offset = offset
		this._createMapAlphaData(img)
	}

	pick(polaris: PolarisGSI, pointerCoords: CoordV2): PickInfo | undefined {
		// @why polaris.pick?
		// if (!this.mesh || !this.mesh.geometry || !this._imgAlphaData || !polaris.pick) return
		if (!this.mesh || !this.mesh.geometry || !this._imgAlphaData) return

		/**
		 * 1. Transform positions to world coords
		 * 2. Compare pointer canvasCoords with each point canvasCoords
		 * 3. Get uv/pointer-coords on point
		 * 4. Search for alpha on that coord pixel
		 */
		const worldMatrixArr = polaris.matrixProcessor.getWorldMatrix(this.mesh)
		if (!worldMatrixArr) {
			console.error('POILayer - get mesh worldMatrix error')
			return
		}
		this._worldMatrix.fromArray(worldMatrixArr)

		const w = this._imgWidth
		const h = this._imgHeight
		const positions = this.mesh.geometry.attributes.position?.array
		const itemSize = this.mesh.geometry.attributes.position?.itemSize
		const sizes = this.mesh.geometry.attributes[this.sizeAttrName || 'aSize']?.array

		if (!positions || isDISPOSED(positions) || !itemSize) {
			console.log('PointsPickHelper - positions attribute do not exist or has been disposed. ')
			return
		}

		if (!sizes || isDISPOSED(sizes)) {
			console.log('PointsPickHelper - positions attribute do not exist or has been disposed. ')
			return
		}

		const count = positions.length / itemSize

		for (let i = count - 1; i >= 0; i--) {
			const localPos = new Vector3().fromArray(positions, i * 3)

			/**
			 * @NOTE
			 * Polaris resolution ratio will effect on image rendering
			 * Since the raw size already been multiplied by ratio in geom creation
			 * eg. 32px size in ratio of 2.0 would result in 64px in actual size attribute
			 * Therefore we need to devide ratio here to get correct image render size
			 */

			const size = sizes[i] / polaris.ratio
			const halfSize = size / 2

			this._position.copy(localPos)
			this._position.applyMatrix4(this._worldMatrix)
			const screenXY = polaris.getScreenXY(this._position.x, this._position.y, this._position.z)

			if (!screenXY) {
				console.error('PointsMeshPickHelper - ScreenXY is undefined')
				return
			}

			const offsetX = halfSize * this.offset[0]
			const offsetY = halfSize * this.offset[1]
			screenXY[0] = screenXY[0] + offsetX
			screenXY[1] = screenXY[1] + offsetY

			// pointerCoords 坐标以 container 左下角为原点，polaris.getScreenXY以左上角为原点
			screenXY[1] = polaris.height - screenXY[1]

			this._pointBox.min.set(screenXY[0] - halfSize, screenXY[1] - halfSize)
			this._pointBox.max.set(screenXY[0] + halfSize, screenXY[1] + halfSize)

			// ----- DEBUG -----
			// const bsize = new Vector2()
			// this._pointBox.getSize(bsize)
			// const bcenter = new Vector2()
			// this._pointBox.getCenter(bcenter)
			// div.style.width = bsize.x + 'px'
			// div.style.height = bsize.y + 'px'
			// div.style.left = bcenter.x - halfSize + 'px'
			// div.style.top = bcenter.y - halfSize + 'px'
			// ----- DEBUG -----

			if (
				pointerCoords.x < this._pointBox.min.x ||
				pointerCoords.x > this._pointBox.max.x ||
				pointerCoords.y < this._pointBox.min.y ||
				pointerCoords.y > this._pointBox.max.y
			) {
				continue
			}

			// Point hitted
			// Check px alpha
			this._uv.set(
				(pointerCoords.x - this._pointBox.min.x) / size,
				(pointerCoords.y - this._pointBox.min.y) / size
			)
			const x = Math.floor(this._uv.x * w)
			const y = Math.floor(this._uv.y * h)
			const alpha = this._imgAlphaData[w * y + x]
			if (alpha >= 127) {
				// Intersection is valid
				const dataIndex = i
				const cam = polaris.cameraProxy
				this._vec3.set(
					cam.position[0] - cam.center[0],
					cam.position[1] - cam.center[1],
					cam.position[2] - cam.center[2]
				)

				const event: PickInfo = {
					/**
					 * 碰撞点与视点距离
					 */
					distance: this._position.distanceTo(this._vec3),

					/**
					 * data item 索引
					 */
					index: dataIndex,

					/**
					 * 碰撞点世界坐标
					 */
					point: this._position.clone(),

					/**
					 * 碰撞点本地坐标
					 */
					pointLocal: localPos,

					/**
					 * Layer specific
					 */
					object: this.mesh,

					/**
					 * Layer specific
					 */
					data: {},
				}

				return event
			}
		}

		return
	}

	// TODO: refactor picking
	// pick(polaris: PolarisGSI, pointerCoords: CoordV2): PickInfo | undefined {
	// 	// @why polaris.pick?
	// 	// if (!this.mesh || !this.mesh.geometry || !this._imgAlphaData || !polaris.pick) return
	// 	if (!this.mesh || !this.mesh.geometry || !this._imgAlphaData) return

	// 	/**
	// 	 * 1. Transform positions to world coords
	// 	 * 2. Compare pointer canvasCoords with each point canvasCoords
	// 	 * 3. Get uv/pointer-coords on point
	// 	 * 4. Search for alpha on that coord pixel
	// 	 */

	// 	const worldMatrixArr = this.mesh.transform.worldMatrix
	// 	if (!worldMatrixArr) return
	// 	this._worldMatrix.fromArray(worldMatrixArr)

	// 	const w = this._imgWidth
	// 	const h = this._imgHeight
	// 	const positions = this.mesh.geometry.attributes.position.array
	// 	const sizes = this.mesh.geometry.attributes[this.sizeAttrName || 'aSize'].array
	// 	const count = this.mesh.geometry.attributes.position.count

	// 	if (!positions || isDISPOSED(positions)) {
	// 		console.log('PointsPickHelper - positions attribute do not exist or has been disposed. ')
	// 		return
	// 	}

	// 	if (!sizes || isDISPOSED(sizes)) {
	// 		console.log('PointsPickHelper - positions attribute do not exist or has been disposed. ')
	// 		return
	// 	}

	// 	for (let i = count - 1; i >= 0; i--) {
	// 		const localPos = new Vector3().fromArray(positions, i * 3)

	// 		/**
	// 		 * @NOTE
	// 		 * Polaris resolution ratio will effect on image rendering
	// 		 * Since the raw size already been multiplied by ratio in geom creation
	// 		 * eg. 32px size in ratio of 2.0 would result in 64px in actual size attribute
	// 		 * Therefore we need to devide ratio here to get correct image render size
	// 		 */

	// 		const size = sizes[i] / polaris.ratio
	// 		const halfSize = size / 2

	// 		this._position.copy(localPos)
	// 		this._position.applyMatrix4(this._worldMatrix)
	// 		const screenXY = polaris.getScreenXY(this._position.x, this._position.y, this._position.z)

	// 		const offsetX = halfSize * this.offset[0]
	// 		const offsetY = halfSize * this.offset[1]
	// 		screenXY[0] = screenXY[0] + offsetX
	// 		screenXY[1] = screenXY[1] + offsetY

	// 		// pointerCoords 坐标以 container 左下角为原点，polaris.getScreenXY以左上角为原点
	// 		screenXY[1] = polaris.height - screenXY[1]

	// 		this._pointBox.min.set(screenXY[0] - halfSize, screenXY[1] - halfSize)
	// 		this._pointBox.max.set(screenXY[0] + halfSize, screenXY[1] + halfSize)

	// 		// ----- DEBUG -----
	// 		// const bsize = new Vector2()
	// 		// this._pointBox.getSize(bsize)
	// 		// const bcenter = new Vector2()
	// 		// this._pointBox.getCenter(bcenter)
	// 		// div.style.width = bsize.x + 'px'
	// 		// div.style.height = bsize.y + 'px'
	// 		// div.style.left = bcenter.x - halfSize + 'px'
	// 		// div.style.top = bcenter.y - halfSize + 'px'
	// 		// ----- DEBUG -----

	// 		if (
	// 			pointerCoords.x < this._pointBox.min.x ||
	// 			pointerCoords.x > this._pointBox.max.x ||
	// 			pointerCoords.y < this._pointBox.min.y ||
	// 			pointerCoords.y > this._pointBox.max.y
	// 		) {
	// 			continue
	// 		}

	// 		// Point hitted
	// 		// Check px alpha
	// 		this._uv.set(
	// 			(pointerCoords.x - this._pointBox.min.x) / size,
	// 			(pointerCoords.y - this._pointBox.min.y) / size
	// 		)
	// 		const x = Math.floor(this._uv.x * w)
	// 		const y = Math.floor(this._uv.y * h)
	// 		const alpha = this._imgAlphaData[w * y + x]
	// 		if (alpha >= 127) {
	// 			// Intersection is valid
	// 			const dataIndex = i
	// 			const cam = polaris.cameraProxy
	// 			this._vec3.set(
	// 				cam.position[0] - cam.center[0],
	// 				cam.position[1] - cam.center[1],
	// 				cam.position[2] - cam.center[2]
	// 			)

	// 			const event: PickInfo = {
	// 				/**
	// 				 * 碰撞点与视点距离
	// 				 */
	// 				distance: this._position.distanceTo(this._vec3),

	// 				/**
	// 				 * data item 索引
	// 				 */
	// 				index: dataIndex,

	// 				/**
	// 				 * 碰撞点世界坐标
	// 				 */
	// 				point: this._position.clone(),

	// 				/**
	// 				 * 碰撞点本地坐标
	// 				 */
	// 				pointLocal: localPos,

	// 				/**
	// 				 * Layer specific
	// 				 */
	// 				object: this.mesh,

	// 				/**
	// 				 * Layer specific
	// 				 */
	// 				data: {},
	// 			}

	// 			return event
	// 		}
	// 	}

	// 	return
	// }

	_createMapAlphaData(image: string | HTMLImageElement) {
		// Prepare image alpha data
		if (typeof image === 'string') {
			const img = new Image()
			img.setAttribute('crossOrigin', 'anonymous')
			img.onload = () => {
				const width = img.naturalWidth
				const height = img.naturalHeight
				const canvas = document.createElement('canvas')

				canvas.width = width
				canvas.height = height

				const ctx = canvas.getContext('2d')
				if (!ctx) {
					console.error('PointsMeshPickHelper - 2d img canvas creation failed. ')
					return
				}
				ctx.drawImage(img, 0, 0)
				const dataArray = ctx.getImageData(0, 0, width, height).data
				const pixels = dataArray.length / 4

				this._imgWidth = width
				this._imgHeight = height

				this._imgAlphaData = new Uint8Array(pixels)

				// Fill alpha data
				for (let i = 0; i < pixels; i++) {
					this._imgAlphaData[i] = dataArray[i * 4 + 3]
				}
			}
			img.src = image
		} else {
			const width = image.naturalWidth
			const height = image.naturalHeight
			const canvas = document.createElement('canvas')

			canvas.width = width
			canvas.height = height

			const ctx = canvas.getContext('2d')
			if (!ctx) {
				console.error('PointsMeshPickHelper - 2d img canvas creation failed. ')
				return
			}
			ctx.drawImage(image, 0, 0)
			const dataArray = ctx.getImageData(0, 0, width, height).data
			const pixels = dataArray.length / 4

			this._imgWidth = width
			this._imgHeight = height

			this._imgAlphaData = new Uint8Array(pixels)

			// Fill alpha data
			for (let i = 0; i < pixels; i++) {
				this._imgAlphaData[i] = dataArray[i * 4 + 3]
			}
		}

		//
		// document.body.appendChild(canvas)
		// canvas.style.position = 'absolute'
		// canvas.style.left = '5px'
		// canvas.style.top = '5px'
	}
}
