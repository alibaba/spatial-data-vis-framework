import { SceneBase } from '../private/base/SceneBase'
import { occupyID } from '../private/utils/unique'

const defaultScene = new SceneBase()

// @TODO: 放constructor里？

defaultScene.id = 'LOCAL_SCENE_DEFAULT'
defaultScene.name = 'DefaultScene'
defaultScene.cameraStateCode = '1|0.001242|0.000952|0.000000|0.87540|0.24000|18.66000'

occupyID(defaultScene.id)

export default defaultScene
