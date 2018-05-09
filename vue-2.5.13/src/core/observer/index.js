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
 * 通常一个响应属性被设置后，对应属性值也会具备响应性。尽管如此当向下传递属性的时候，我们不希望属性值具备响应性，因为属性值可能是一个处于冻结数据结构的嵌套值，转变为响应性将会打破原有结构。所以需要有一个开关去控制是否允许属性值具备响应性。
 */
export const observerState = {
  shouldConvert: true
}

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 * Observer类会被关联到每个被观察对象上，关联时会转换目标对象的属性为getter/setter，这两个属性正正用于收集依赖项并且触发依赖项更新。
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that has this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep() // 初始化Dep实例，并赋值给【Observer类实例】的属性
    this.vmCount = 0
    def(value, '__ob__', this)  // 给传入参数绑定__ob__属性，值为【Observer类实例】
    if (Array.isArray(value)) {
      const augment = hasProto
        ? protoAugment
        : copyAugment
      augment(value, arrayMethods, arrayKeys)
      this.observeArray(value)  // 传入参数为数组
    } else {
      this.walk(value)  // 传入参数不为数组
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
 * 疑问：其实Watcher跟Oberser之间是什么关系？ --- 20180509
 * 目的：是用传入参数来创建观察者实例
 * 如果观察成功则返回新的观察者实例；如果传入参数已经在观察者实例，则返回存在的观察者实例
 * @param {any} value - 对象实例
 * @param {boolean} asRootData - 是否作为根数据
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 判断是否为对象类型 或者 对象实例是否属于VNode这个类
  if (!isObject(value) || value instanceof VNode) {
    return
  }

  // 声明变量
  let ob: Observer | void
  // 判断对象实例是否具有__ob__这个属性 并且 这个属性是Observer类的实例
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    // 将对象实例的__ob__属性 赋值给变量 => 可能value.__ob__这个对象存在一个vmCount属性，值为0
    ob = value.__ob__
  } else if (
    observerState.shouldConvert &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    // 科普：ES6 - Object.isExtensible(obj)用于判断对象obj是否可以被拓展，通常与Object.preventExtensions(obj)封锁对象obj增加属性，但能修改现有属性值来使用
    // 将对象实例作为参数传入，创建Observer类的实例，赋值给变量 => 在实例化的时候可能存在这行代码：this.vmCount = 0
    ob = new Observer(value)
  }

  // 如果存在第二个参数，则给变量的vmCount属性进行累加
  if (asRootData && ob) {
    ob.vmCount++
  }

  // 返回变量
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
  // 创建依赖实例dep
  /**
   * Dep:所有vue实例的响应属性都需要 同步 到【依赖类】来备份管理。该【依赖类】可以被【监听类】观察，可以被【多个指令】订阅。
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

  // 声明标识
  // observe: 将传入参数来创建观察者实例，如果观察成功则返回新的观察者实例；如果传入参数已经在观察者实例，则返回存在的观察者实例。
  let childOb = !shallow && observe(val)

  // 往对象上挂载属性
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 定义该对象属性的默认值 => 存在该用回；不存在则用传参
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        // 将【当前依赖实例】添加到【依赖数组】
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

      // 将 现在的赋值 用于创建新的观察者实例
      // observe: 将传入参数来创建观察者实例，如果观察成功则返回新的观察者实例；如果传入参数已经在观察*者实例，则返回存在的观察者实例。
      childOb = !shallow && observe(newVal)

      // 通知Vue，依赖项有更新，观察者需要同步更新
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
