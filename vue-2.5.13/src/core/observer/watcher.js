/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError
} from '../util/index'  // 引入工具函数

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'  // 引入调度器模块
import Dep, { pushTarget, popTarget } from './dep'  // 引入依赖模块相关的内容

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 * 监听类 解析表达式，收集依赖项，在表达式值改变的时候触发回调函数。
 * 在【$watch()这个api】和【指令】中体现出来它的魅力。
 */
export default class Watcher {
  vm: Component;  // vue实例
  expression: string; // 表达式
  cb: Function; // 回调函数
  id: number; // 标识
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>; // 依赖项数组
  newDeps: Array<Dep>;  // 新依赖项数组
  depIds: SimpleSet;  // 依赖项ID
  newDepIds: SimpleSet;  // 新依赖项ID
  getter: Function; // 默认值
  value: any; // 设置值

  // 创建实例时传入的参数 对应 构造函数的参数
  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm  // 将vue实例挂载到【监听类实例】
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this) // 将当前【监听类实例】推到vue实例的_watchers数组属性
    // options
    // 将传入参数挂载到【监听类实例】
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching uid - 用于批处理
    this.active = true
    this.dirty = this.lazy // for lazy watchers - 用于延迟监听

    // 给【监听类实例】一个属性，该属性用于存放 依赖项 / 新依赖项
    this.deps = []
    this.newDeps = []

    // 给【监听类实例】一个属性，该属性用于创建一个项唯一的集合
    this.depIds = new Set()
    this.newDepIds = new Set()

    // 根据环境给【监听类实例】挂载属性
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''

    // parse expression for getter - 根据解析后的表达式给【监听类实例】挂载属性
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      // 如果this.getter无法解析，则重新用一个函数赋值覆盖掉
      if (!this.getter) {
        this.getter = function () {}
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }

    // 根据this.lazy的值来给【监听类实例】挂载属性
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   * 调用【监听类实例】的getter，并且重新收集依赖项
   */
  get () {
    // 假设【Dep类的target对象属性】存在，则往目标栈推送该对象，然后将【监听类实例】推送到覆盖掉原有【Dep类的target对象属性】
    pushTarget(this)

    // 声明变量
    let value

    // 暂存【监听类实例】属性 - btw，属性值是vue实例
    const vm = this.vm

    // 20180508
    try {
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
