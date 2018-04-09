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

    // a flag to avoid this being observed - 给实例一个属性，避免实例被观察
    vm._isVue = true

    console.log('基础 => 一个实例的constructor属性是创造它的构造函数本身：', vm.constructor, vm.constructor.super)
    console.log('即使demo.html里是先声明自定义组件后创建实例，但是控制台触发的却是相反。Vue的机制好似是pub/sub发布订阅模式，要不然的话控制台输出应该是先组件后实例')
    
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
      // 1. 由于动态选项合并非常缓慢，所以需要进一步优化 实例化Vue 流程
      console.log('opt2: 优化实例化，但是不能直接在实例化的时候用_isComponent: true，会报错：Cannot read property componentOptions of undefined，需要配合特殊条件；只有在自定义组件时会自动给options加上的_isComponent才有意义', '优先创建组件', options._isComponent)
      initInternalComponent(vm, options)  // 应该就是这个方法会检测到当前的方式，然后决定是否添加_isComponent属性
    } else {
      // 1. 普通实例化
      // 2. 赋值给实例一个$options属性，值为合并选项模块处理后的结果
      console.log('opt1: 正常实例化，优先处理创建实例', options._isComponent)
      // 三个参数：1）传入参数为Vue类本身的函数返回值 2）options 3）vue实例本身
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }

    // 20180409 20:25
    /* istanbul ignore else */
    // 非生产环境需要调用 初始化代理模块，传入vue实例作为参数
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      // 生产环境则 赋值给vue实例一个_renderProxy属性，键值为实例本身
      vm._renderProxy = vm
    }

    // expose real self
    // 赋值给vue实例一个_self属性，键值为实例本身
    vm._self = vm

    // 20180409 20:34
    // 上面已经对创建实例做出完初始化属性，紧接着就是引入生命周期模块、事件模块、渲染模块(template)、回调钩子模块=>触发beforeCreate生命周期(应该跟生命周期挂钩)、初始化注入模块、初始化状态模块(处理state、props)、初始化供应模块、回调钩子模块=>触发create生命周期(应该跟生命周期挂钩)
    // 这里可以对照官网周期图，看看Vue在这两个生命周期前后做了啥
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
