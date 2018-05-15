/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * Dep是一种可以被观察 并且 可以被多个指令订阅的类，通过new Dep()实例化创建的是【依赖实例】
 */
export default class Dep {
  // flow定义数据类型
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    // 这里的属性都是创建实例化就带上的
    this.id = uid++
    this.subs = []  // 被订阅的数组
  }

  addSub (sub: Watcher) {
    this.subs.push(sub) // 将【观察者实例】添加到【订阅数组】
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub) // 将【观察者实例】从【订阅数组】移除
  }

  depend () {
    // 判断Dep类是否有target对象
    if (Dep.target) {
      // 来到这里极有可能，pushTarget已经被调用过 => 即Dep.target的值已经被【观察者实例】覆盖 => 凡是涉及到调用Dep.target的方法，都可以看【Watcher.js】
      // 添加【当前依赖实例】到 【观察者实例】的相关数组
      Dep.target.addDep(this)
    }
  }

  notify () {
    // stabilize the subscriber list first
    // 首先备份【订阅数组】
    const subs = this.subs.slice()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()  // 这里我们可以得知【每个观察者实例都具备update这个方法，用于更新观察者】
    }
  }
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
// 当前目标的观察者正在执行。这个属性是全局且唯一的，【因为在任何时候都只会有一个观察者在执行】。

// 初始化Dep的target属性
Dep.target = null

// 初始化目标栈
const targetStack = []

/**
 * 推送目标对象
 * @param {*} _target - 【Watch类实例】
 */
export function pushTarget (_target: Watcher) {
  // 如果Dep类的target对象存在，则往目标栈推送该对象
  if (Dep.target) targetStack.push(Dep.target)
  // 然后将【Watch类实例】覆盖掉【Dep类的target对象属性】
  Dep.target = _target
}

/**
 * 移除目标对象
 */
export function popTarget () {
  // 先从目标栈移除最后一项，然后将返回数组覆盖掉【Dep类的target对象属性】
  Dep.target = targetStack.pop()
}
