/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * 该文件中不需要考虑node兼容性
 */

// @TODO 可删减
// import is from 'is'

// TODO 浏览器兼容性
// export const isTouchDevice = is.touchDevice()
import { default as isTouchDeviceF } from 'is-touch-device'

export const isTouchDevice = isTouchDeviceF()
