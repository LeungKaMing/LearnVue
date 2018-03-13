import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'

// 调用初始化全局API方法
initGlobalAPI(Vue)

// 给Vue原型上的$isServer设置默认值为 isServerRendering
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

// 给Vue原型上的$ssrContext设置默认布尔值
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

// 增加版本号
Vue.version = '__VERSION__'

export default Vue
