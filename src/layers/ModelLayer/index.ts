import { GLTF2Loader } from '@gs.i/frontend-gltf2'
import { IR } from '@gs.i/schema-scene'
import { traverse } from '@gs.i/utils-traverse'

import { StandardLayer } from '@polaris.gl/gsi'
import { createFromDesc } from '@polaris.gl/projection'

import { DescToParsedType, DescToType, parseProps } from '../../private/utils/props'

export const info = {
	name: 'Basic Model Loader',
	category: 'Internal',
}

/**
 * Props Description. Used to generate the props editor UI.
 */
export const propsDesc = [
	{
		name: 'glb 模型地址',
		key: 'glb',
		type: 'string',
		defaultValue: '',
		mutable: false,
	},
	{
		name: 'scale',
		key: 'scale',
		type: 'number',
		defaultValue: 1,
		range: { min: 0, max: 1000 },
		mutable: false,
	},
	{
		name: '投影描述',
		key: 'projectionDesc',
		type: 'string',
		defaultValue: 'desc0|MercatorProjection|right|meters|0,0,0',
		mutable: false,
		$editor: {
			subtype: 'projection',
		},
	},
] as const

type ModelLayerConfig = DescToType<typeof propsDesc>

const loader = new GLTF2Loader()

export function createModelLayer(_config: ModelLayerConfig): StandardLayer {
	const config = parseProps(_config, propsDesc)

	const projection = createFromDesc(config.projectionDesc)

	const layer = new StandardLayer({
		projection,
	})

	layer.addEventListener('init', async () => {
		if (!config.glb) {
			console.log('no glb provided, skip')
			return
		}

		const modelRes = await fetch(config.glb)
		const bin = await modelRes.arrayBuffer()

		const glm = loader.glbToGLM(bin)
		const node = loader.parse(glm)

		layer.group.add(node)

		layer.group.transform.scale.set(config.scale, config.scale, config.scale)

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
