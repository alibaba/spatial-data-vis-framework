import { SceneBase } from '../private/base/SceneBase'
import { occupyID } from '../private/utils/unique'

const scene = new SceneBase()

// @TODO: 放constructor里？

scene.id = 'LOCAL_SCENE_2'
scene.name = 'scene2'
scene.cameraStateCode = '1|0.000200|0.000943|0.000000|0.99540|-0.48000|19.27600'
scene.layers = ['LOCAL_LAYER_0', 'LOCAL_LAYER_1', 'LOCAL_LAYER_3']

occupyID(scene.id)

export default scene
