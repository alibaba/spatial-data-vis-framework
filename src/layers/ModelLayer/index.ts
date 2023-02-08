import { GLTF2Loader } from '@gs.i/frontend-gltf2'
import { IR } from '@gs.i/schema-scene'
import { specifyUnlitMaterial } from '@gs.i/utils-specify'
import { traverse } from '@gs.i/utils-traverse'

import { StandardLayer, StandardLayerProps } from '@polaris.gl/gsi'
import { createFromDesc } from '@polaris.gl/projection'

import type { PropDescription } from '../../private/schema/meta'

interface ModelLayerConfig {
	name?: string
	glb: string
	scale?: number
	projectionDesc: string
	// transform:
}

export function createModelLayer(config: ModelLayerConfig): StandardLayer {
	const projection = createFromDesc(config.projectionDesc)

	const layer = new StandardLayer({
		projection,
	})

	const loader = new GLTF2Loader()

	layer.addEventListener('init', async () => {
		const modelRes = await fetch(config.glb)
		const bin = await modelRes.arrayBuffer()

		const glm = loader.glbToGLM(bin)
		const node = loader.parse(glm)

		layer.group.add(node)

		// debugger

		if (config.scale) {
			layer.group.transform.scale.set(config.scale, config.scale, config.scale)
		}

		traverse(node, (n) => {
			if (IR.isRenderable(n)) {
				const tex = (n.material as IR.PbrMaterial)['emissiveTexture'] as IR.Texture
				if (tex) {
					tex.sampler.magFilter = 'LINEAR'
					tex.sampler.minFilter = 'LINEAR_MIPMAP_LINEAR'
					tex.sampler.wrapS = 'MIRRORED_REPEAT'
					tex.sampler.wrapT = 'MIRRORED_REPEAT'
					tex.sampler.anisotropy = 8
				}
				// tex.image.extensions = { EXT_image_encoding: 'SRGB' }
				// n.material = specifyUnlitMaterial({
				// 	type: 'unlit',
				// 	baseColorTexture: tex,
				// })
			}
		})
	})

	return layer
}

/**
 * Props Description. Used to generate the props editer UI.
 */
export const propsDesc = [
	{
		name: 'glb 模型地址',
		key: 'glb',
		type: 'string',
		mutable: false,
	},
	{
		name: 'scale',
		key: 'scale',
		type: 'number',
		mutable: true,
	},
	{
		name: '投影描述',
		key: 'projectionDesc',
		type: 'string',
		mutable: false,
	},
] as PropDescription[]
