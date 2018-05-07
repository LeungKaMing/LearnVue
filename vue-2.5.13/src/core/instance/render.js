/* @flow */

import {
  warn,
  nextTick,
  emptyObject,
  handleError,
  defineReactive
} from '../util/index'

import { createElement } from '../vdom/create-element'
import { installRenderHelpers } from './render-helpers/index'
import { resolveSlots } from './render-helpers/resolve-slots'
import VNode, { cloneVNodes, createEmptyVNode } from '../vdom/vnode'

import { isUpdatingChildComponent } from './lifecycle'

// 0502
/**
 * 初始化渲染
 * @param {*} vm - vue实例
 */
export function initRender (vm: Component) {
  // 初始化节点相关属性 赋值给vue实例
  vm._vnode = null // the root of the child tree
  vm._staticTrees = null // v-once cached trees

  // 暂存 初始化vue实例的对象参数
  const options = vm.$options
  // 暂存 对象参数的_parentVnode属性，并将该属性值赋值给$vnode属性
  const parentVnode = vm.$vnode = options._parentVnode // the placeholder node in parent tree
  // 判断上述变量是否存在context属性，暂存
  const renderContext = parentVnode && parentVnode.context

  // 初始化插槽属性 赋值给vue实例
  vm.$slots = resolveSlots(options._renderChildren, renderContext)
  vm.$scopedSlots = emptyObject

  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // internal version is used by render functions compiled from templates
  /* 1. 绑定createElement函数到vue实例，这样我们就可以通过该函数来获取到准确的上下文。
   * 2. 参数的顺序：标识符【HTML标签 或者 自定义组件名字】，数据【通常是对象类型；包括类样式，行内样式，DOM属性，自定义属性，事件监听器，vue自定义指令，插槽相关，标识】，子元素【通常是数组类型】，是否格式化。
   * 3. 格式化代码在开发版本通常是在渲染函数将模版编译过来的情况下使用。
   * 结论：将createElement函数 暂存到vue实例的_c属性
   */
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)

  // normalization is always applied for the public version, used in
  // user-written render functions.
  /**
   * 格式化代码通常应用在生产版本中，在用户书写的渲染函数体现【或者说调用这个方法都是要格式化代码的】。
   */
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)

  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated
  /**
   * 把vue实例的 $attrs 和 $listeners属性暴露出来，以便使用户构建HOC时更简单，并且这两个属性需要具备响应性的，这样可使HOC高阶组件使用时保持着最新状态。
   * 判断上述变量是否存在data属性，暂存
   */
  const parentData = parentVnode && parentVnode.data

  /* istanbul ignore else */
  // 不同环境唯一区别就是：第四个参数是否传一个函数为参数
  if (process.env.NODE_ENV !== 'production') {
    // 非生产环境
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$attrs is readonly.`, vm)
    }, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$listeners is readonly.`, vm)
    }, true)
  } else {
    // 生产环境
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, null, true)
  }
}

export function renderMixin (Vue: Class<Component>) {
  // install runtime convenience helpers
  installRenderHelpers(Vue.prototype)

  Vue.prototype.$nextTick = function (fn: Function) {
    return nextTick(fn, this)
  }

  Vue.prototype._render = function (): VNode {
    const vm: Component = this
    const { render, _parentVnode } = vm.$options

    if (vm._isMounted) {
      // if the parent didn't update, the slot nodes will be the ones from
      // last render. They need to be cloned to ensure "freshness" for this render.
      for (const key in vm.$slots) {
        const slot = vm.$slots[key]
        // _rendered is a flag added by renderSlot, but may not be present
        // if the slot is passed from manually written render functions
        if (slot._rendered || (slot[0] && slot[0].elm)) {
          vm.$slots[key] = cloneVNodes(slot, true /* deep */)
        }
      }
    }

    vm.$scopedSlots = (_parentVnode && _parentVnode.data.scopedSlots) || emptyObject

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    vm.$vnode = _parentVnode
    // render self
    let vnode
    try {
      vnode = render.call(vm._renderProxy, vm.$createElement)
    } catch (e) {
      handleError(e, vm, `render`)
      // return error render result,
      // or previous vnode to prevent render error causing blank component
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        if (vm.$options.renderError) {
          try {
            vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
          } catch (e) {
            handleError(e, vm, `renderError`)
            vnode = vm._vnode
          }
        } else {
          vnode = vm._vnode
        }
      } else {
        vnode = vm._vnode
      }
    }
    // return empty vnode in case the render function errored out
    if (!(vnode instanceof VNode)) {
      if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
        warn(
          'Multiple root nodes returned from render function. Render function ' +
          'should return a single root node.',
          vm
        )
      }
      vnode = createEmptyVNode()
    }
    // set parent
    vnode.parent = _parentVnode
    return vnode
  }
}
