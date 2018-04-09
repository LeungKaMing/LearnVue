import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// 构造函数
/**
 * new Vue({
 *  _isComponent: true
 *  data: {},
 *  watch: {},
 *  computed: {},
 *  created () {},
 *  methods: {}
 * })
 */
function Vue (options) {
  // 当前环境为非生产环境 且 并不是通过new Vue()创建实例，而是直接通过Vue()创建实例；this此刻为window
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // 调用绑定在Vue原型上的_init方法，把声明实例的参数options传入 => 这个绑定_init方法是在initMixin中进行！
  this._init(options)
}

initMixin(Vue)  // 规定只能传构造函数，因为入面要对构造函数的原型做处理
stateMixin(Vue)  // 规定只能传构造函数，因为入面要对构造函数的原型做处理
eventsMixin(Vue)  // 规定只能传构造函数，因为入面要对构造函数的原型做处理
lifecycleMixin(Vue)  // 规定只能传构造函数，因为入面要对构造函数的原型做处理
renderMixin(Vue)  // 规定只能传构造函数，因为入面要对构造函数的原型做处理

export default Vue
