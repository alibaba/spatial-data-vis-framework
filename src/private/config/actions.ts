/**
 * This file is used for config management outside Polaris App.
 * For example, when you write a GUI config editor. You can use these actions and
 * reducers for React hooks and Redux.
 * @note this reducer use immer. Config should be treated as immutable.
 * @note you need to understand react.reducer.hook and immer to use this reducer.
 */
import produce from 'immer'

import type { ConfigEventData } from './ConfigManager'
import type { AppConfig } from './schema'

// map event types to a union
type ConfigEventActions = {
	[T in keyof ConfigEventData]: { type: T; payload: ConfigEventData[T] }
}[keyof ConfigEventData]

export type ConfigActions =
	| ConfigEventActions
	| {
			type: 'change'
			payload: (draft: AppConfig) => AppConfig | void
	  }
	| {
			type: 'cleanUpLayerFilters'
	  }

/**
 * This reducer is used for config management in React.
 * @example
 * ```tsx
 * function App() {
 * 	const [config, dispatch] = useReducer(configReducer, null)
 *
 * 	... get initial config ...
 *
 * 	useEffect(() => {
 * 		dispatch({ type: 'init', payload: initialConfig })
 * 	}, [initialConfig])
 *
 * 	return (<div>)
 *
 * }
 * ```
 */
export function configReducer(
	prevConfig: AppConfig | null,
	action: ConfigActions
): AppConfig | null {
	return produce(prevConfig, (draft: AppConfig) => {
		if (!draft && action.type !== 'init')
			throw new Error('ConfigReducer: init config before editing')

		switch (action.type) {
			// init

			case 'init': {
				return action.payload
			}

			// custom change

			case 'change': {
				return action.payload(draft)
			}

			// cleanup

			case 'cleanUpLayerFilters': {
				cleanUpLayerFilters(draft)
				return
			}

			// PolarisAppConfig 标准操作:
			// @from ConfigManager::registerConfigSync

			case 'app:change': {
				draft.app = action.payload
				return
			}

			case 'layer:add': {
				if (draft.layers.some((layer) => layer.id === action.payload.id))
					throw new Error(`Layer id ${action.payload.id} already exists`)

				draft.layers.push(action.payload)
				break
			}

			case 'layer:remove': {
				const index = draft.layers.findIndex((layer) => layer.id === action.payload.id)

				if (index === -1) throw new Error(`Layer id ${action.payload.id} not found`)

				draft.layers.splice(index, 1)
				break
			}

			case 'layer:change:name': {
				const layer = draft.layers.find((layer) => layer.id === action.payload.id)

				if (!layer) throw new Error(`Layer id ${action.payload.id} not found`)

				layer.name = action.payload.name
				break
			}

			case 'layer:change:props': {
				const layer = draft.layers.find((layer) => layer.id === action.payload.id)

				if (!layer) throw new Error(`Layer id ${action.payload.id} not found`)

				layer.props = action.payload.props
				break
			}

			case 'stage:add': {
				if (draft.stages.some((stage) => stage.id === action.payload.id))
					throw new Error(`Stage id ${action.payload.id} already exists`)

				draft.stages.push(action.payload)
				break
			}

			case 'stage:remove': {
				const index = draft.stages.findIndex((stage) => stage.id === action.payload.id)

				if (index === -1) throw new Error(`Stage id ${action.payload.id} not found`)

				draft.stages.splice(index, 1)
				break
			}

			case 'stage:change:name': {
				const stage = draft.stages.find((stage) => stage.id === action.payload.id)

				if (!stage) {
					throw new Error(`Stage id ${action.payload.id} not found`)
				}

				stage.name = action.payload.name
				break
			}

			case 'stage:change:layers': {
				const stage = draft.stages.find((stage) => stage.id === action.payload.id)

				if (!stage) throw new Error(`Stage id ${action.payload.id} not found`)

				stage.layers = action.payload.layers
				break
			}

			case 'stage:change:projection': {
				const stage = draft.stages.find((stage) => stage.id === action.payload.id)

				if (!stage) throw new Error(`Stage id ${action.payload.id} not found`)

				stage.projection = action.payload.projection
				break
			}

			case 'scene:add': {
				if (draft.scenes.some((scene) => scene.id === action.payload.id))
					throw new Error(`Scene id ${action.payload.id} already exists`)

				draft.scenes.push(action.payload)
				break
			}

			case 'scene:remove': {
				const index = draft.scenes.findIndex((scene) => scene.id === action.payload.id)

				if (index === -1) throw new Error(`Scene id ${action.payload.id} not found`)

				draft.scenes.splice(index, 1)
				break
			}

			case 'scene:change:name': {
				const scene = draft.scenes.find((scene) => scene.id === action.payload.id)

				if (!scene) throw new Error(`Scene id ${action.payload.id} not found`)

				scene.name = action.payload.name
				break
			}

			case 'scene:change:layers': {
				const scene = draft.scenes.find((scene) => scene.id === action.payload.id)

				if (!scene) throw new Error(`Scene id ${action.payload.id} not found`)

				scene.layers = action.payload.layers
				break
			}

			case 'scene:change:stage': {
				const scene = draft.scenes.find((scene) => scene.id === action.payload.id)

				if (!scene) throw new Error(`Scene id ${action.payload.id} not found`)

				scene.stage = action.payload.stage
				break
			}

			case 'scene:change:cameraStateCode': {
				const scene = draft.scenes.find((scene) => scene.id === action.payload.id)

				if (!scene) throw new Error(`Scene id ${action.payload.id} not found`)

				scene.cameraStateCode = action.payload.cameraStateCode
				break
			}

			default:
				throw new Error('ConfigReducer: Invalid action type: ' + action['type'])
		}
	})
}

/**
 * change * to specific layer ids
 */
function cleanUpLayerFilters(config: AppConfig) {
	// const layers = config.layers
	const scenes = config.scenes
	const stages = config.stages

	for (const scene of scenes) {
		if (scene.layers.includes('*')) {
			scene.layers = ['*']
		}
	}

	for (const stage of stages) {
		if (stage.layers.includes('*')) {
			stage.layers = ['*']
		}
	}
}
