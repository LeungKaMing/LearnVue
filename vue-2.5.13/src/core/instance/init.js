/* @flow */
// 初始化插件
import config from '../config'
import { initProxy } from './proxy' // 引入初始化代理模块
import { initState } from './state' // 引入状态模块
import { initRender } from './render' // 引入初始化渲染模块
import { initEvents } from './events' // 引入初始化事件模块
import { mark, measure } from '../util/perf'  // 工具方法
import { initLifecycle, callHook } from './lifecycle' // 引入初始化生命周期模块， 引入回调钩子模块
import { initProvide, initInjections } from './inject'  // 引入初始化供应模块，引入初始化注入模块
import { extend, mergeOptions, formatComponentName } from '../util/index' // 工具方法：从公共方法引入 扩展模块、合并选项模块、格式化组件名模块

// 计数器
let uid = 0

// flow写法，其实就是规定参数类型，先无视
export function initMixin (Vue: Class<Component>) {
  // 给Vue原型上绑定_init方法
  Vue.prototype._init = function (options?: Object) {
    // 重命名Vue实例
    const vm: Component = this
    
    // a uid - 给实例一个属性，统计该方法执行次数
    vm._uid = uid++

    // 开始标识、结束标识
    let startTag, endTag

    /* istanbul ignore if */
    // 满足三个条件：1) 非生产环境 2) 3)
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      // 赋值开始标识
      startTag = `vue-perf-start:${vm._uid}`
      // 赋值结束标识
      endTag = `vue-perf-end:${vm._uid}`
      // 把开始标识传给公共方法
      mark(startTag)
    }

    // a flag to avoid this being observed - 给实例一个属性
    vm._isVue = true


    // merge options
    /**
     * 处理实例化Vue传入的对象参数
     * new Vue({
     *  data: {},
     *  watch: {},
     *  computed: {},
     *  created () {},
     *  methods: {}
     * })
     */
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      // 由于动态选项合并非常缓慢，所以需要进一步优化 实例化Vue 流程
      console.log('优化实例化，但是不能直接在实例化的时候用_isComponent: true，会报错：Cannot read property componentOptions of undefined，需要配合特殊条件')
      initInternalComponent(vm, options)
    } else {
      // 普通实例化
      console.log('正常实例化')
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode
  opts._parentElm = options._parentElm
  opts._refElm = options._refElm

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const extended = Ctor.extendOptions
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = dedupe(latest[key], extended[key], sealed[key])
    }
  }
  return modified
}

function dedupe (latest, extended, sealed) {
  // compare latest and sealed to ensure lifecycle hooks won't be duplicated
  // between merges
  if (Array.isArray(latest)) {
    const res = []
    sealed = Array.isArray(sealed) ? sealed : [sealed]
    extended = Array.isArray(extended) ? extended : [extended]
    for (let i = 0; i < latest.length; i++) {
      // push original options and not sealed options to exclude duplicated options
      if (extended.indexOf(latest[i]) >= 0 || sealed.indexOf(latest[i]) < 0) {
        res.push(latest[i])
      }
    }
    return res
  } else {
    return latest
  }
}
