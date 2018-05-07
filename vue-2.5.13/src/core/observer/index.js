/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However when passing down props,
 * we don't want to force conversion because the value may be a nested value
 * under a frozen data structure. Converting it would defeat the optimization.
 */
export const observerState = {
  shouldConvert: true
}

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that has this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      const augment = hasProto
        ? protoAugment
        : copyAugment
      augment(value, arrayMethods, arrayKeys)
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }

  /**
   * Walk through each property and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object, keys: any) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
/**
 * 目的：是用传入参数来创建观察者实例
 * 如果观察成功则返回新的观察者实例；如果传入参数已经在观察者实例，则返回存在的观察者实例
 * @param {*} vm - vue实例
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    observerState.shouldConvert &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 * 在对象上定义响应式属性 => Object.defineProperty
 * @param {Object} obj - 对象
 * @param {string} key - 属性名
 * @param {any} val - 默认值
 * @param {Function} customSetter - 默认函数
 * @param {boolean} shallow - 是否浅拷贝
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 创建依赖实例dep => 0507 12:21 先往下看
  /**
   * Dep:
   *
   */
  const dep = new Dep()

  /**
   * 获取【属性描述符对象】然后暂存，什么是属性描述符对象？
   * {
   *   configurable: true,
   *   enumerable: true,
   *   value: 0,
   *   writable: true,
   *   get: function () {},
   *   set: function () {}
   * }
   */
  const property = Object.getOwnPropertyDescriptor(obj, key)

  // 判断configurable字段是否为false
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  // 暂存变量(做非空校验) => 到这里，应该可以看出要往对象的某个属性设置值，应该要先检查一下这个属性值是否已经存在，避免重复赋值 => get / set
  const getter = property && property.get
  const setter = property && property.set

  // 声明标识 => 0507 17:03 先往下看
  /**
   * observe: 将传入的参数与Vue的依赖属性进行对比检查
   *
   */
  let childOb = !shallow && observe(val)

  // 往对象上挂载属性
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 定义该对象属性的默认值 => 存在该用回；不存在则用传参
      const value = getter ? getter.call(obj) : val
      // 不看不行orz...
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      // 该值作为默认值返回
      return value
    },
    set: function reactiveSetter (newVal) {
      // 定义该对象属性的默认值 => 存在则用回默认值；不存在则用传参
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      /**
       * 有什么情况下本身不等于本身？
       * 对象数据类型，如:array，object
       * {} !== {}, [] !== []
       */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      // 非生产环境并且有传入默认函数，则执行该函数
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // 判断该对象是否有赋值函数 => 存在则调用；不存在则用现在的赋值
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }

      // 将 现在的赋值 交给observe函数进行处理 => 更新$data
      childOb = !shallow && observe(newVal)

      // 通知Vue，依赖属性要更新了
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
