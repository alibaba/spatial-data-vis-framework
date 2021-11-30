import { STDLayer } from '@polaris.gl/layer-std'
import { MeshDataType } from '@gs.i/schema'
import { Projection } from '@polaris.gl/projection'
import { Polaris } from '@polaris.gl/schema'

export type TileToken = (number | string)[]

export type TileRenderables = {
	meshes: MeshDataType[]
	layers: STDLayer[]
}

export interface ITileManager {
	update(polaris: Polaris, projection: Projection): void
	getCurrVisibleTiles(): TileRenderables[]
	dispose(): void
}
