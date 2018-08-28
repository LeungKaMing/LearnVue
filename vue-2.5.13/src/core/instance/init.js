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

    console.log('基础 => 一个实例的constructor属性是创造它的构造函数本身：', vm.constructor)
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
      console.log('>>>>>>>opt2: 优化创建组件，但是不能直接在实例化的时候用_isComponent: true，会报错：Cannot read property componentOptions of undefined，需要配合特殊条件；只有在自定义组件时会自动给options加上的_isComponent才有意义<<<<<<<<', options._isComponent)
      initInternalComponent(vm, options)  // 应该就是这个方法会检测到当前的方式，然后决定是否添加_isComponent属性
    } else {
      // 1. 普通实例化
      // 2. 赋值给实例一个$options属性，值为合并选项模块处理后的结果
      console.log('>>>>>>>opt1: 正常实例化，优先处理创建实例<<<<<<<<<<<', options._isComponent)
      // 三个参数：1）传入参数为Vue类本身的函数返回值 2）options 3）vue实例本身
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }

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

    // 上面已经对vue实例完成基本options属性初始化，紧接着就是引入生命周期模块、事件模块、渲染模块(template)、回调钩子模块=>触发beforeCreate生命周期(应该跟生命周期挂钩)、初始化注入模块、初始化状态模块(处理state、props)、初始化供应模块、回调钩子模块=>触发create生命周期(应该跟生命周期挂钩)
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

/**
 * 初始化内部组件方法 => 只有自定义创建组件的时候才触发
 * @param {*} vm - Vue实例
 * @param {*} options 创建Vue实例传入的对象参数
 */
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  // 以vm.constructor.options为原型创建一个对象实例opts
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  // 【初始化操作】把所有现有属性都保存到 opts 这个对象实例上
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

/**
 * 处理构造器选项的方法
 * @param {*} Ctor - 构造器，一般是指类本身
 */
export function resolveConstructorOptions (Ctor: Class<Component>) {
  // 将类的options属性值 赋值给 对象变量
  let options = Ctor.options
  // 如果当前类本身还具有父级
  if (Ctor.super) {
    // 传入该类的父级给当前函数，进行递归，把返回值赋值给变量superOptions
    const superOptions = resolveConstructorOptions(Ctor.super)
    // 将当前类的superOptions属性值 赋值给 临时变量cachedSuperOptions
    const cachedSuperOptions = Ctor.superOptions
    // 上面做法目的就是为了确保当前类【属于最顶层的】
    // 下面判断是为了确保 临时变量cachedSuperOptions 跟 当前类父级的options属性值 一直是相等的
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      // 证明当前类父级的options属性值已经被改变，需要强行【重新赋值当前类的superOptions属性】 => 如何知道当前类父级的options属性值已经被改变？？是否有watch机制监听整个类？
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      // 检查类的options属性值最近是否存在改动 或者 附加，返回值赋值给临时变量modifiedOptions => 一发现有问题就马上检查整个类
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      // 如果存在变动
      if (modifiedOptions) {
        // 将当前类的extendOptions属性值(同options 和 superOptions都属于类本身属性) 和 临时变量modifiedOptions传入该方法进行扩展
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // 首先将变量superOptions 和 当前类的extendOptions属性传入【合并选项方法】；然后把合并返回的结果强制赋值给类的options属性；最后强制赋值给变量options
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      // 如果变量options存在名字属性
      if (options.name) {
        // 将当前类赋值给变量options的某个属性
        options.components[options.name] = Ctor
      }
    }
  }
  // 返回对象变量
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
