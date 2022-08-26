import { getNamedID } from '../utils/unique'

export class SceneBase {
	/**
	 *
	 */
	id: string // = getNamedID('SCENE', this)

	/**
	 *
	 */
	name: string = 'Unnamed Scene'

	/**
	 * choose stage
	 * @default MainStage
	 * @note 暂时不透出 Stage 的概念，所有 layer 默认加入 MainStage
	 * @deprecated Not Implemented Yet
	 */
	stage = 'LOCAL_STAGE_MAIN' as const

	/**
	 * layers to show in the chosen stage. 从 stage 中筛选需要显示的 layer.
	 * @note * means all
	 * @note filtered by id
	 */
	layers: string[] = ['*']
}
