# Vue在render的时候做了什么

## 从render.js里的defineReactive方法，找到其来自于【observer总观察者模块】，【总观察者模块】又会去调用【依赖模块】的方法来对依赖实例做记录，【依赖模块】又会去调用【观察者模块】的方法来对依赖实例做观察。
> Dep.target在initLifecycle 和 initState这两个时刻，会被【观察者实例】赋值，源码里涉及到调用Dep.target的方法都是在调用【观察者实例】的方法 => 可以看出Watcher类跟Dep类是各自调用对方的方法
0. 现在在render阶段，有两个属性：$attrs和$listeners。这两个属性通过defineReactive方法挂载到vue实例上。
1. 从defineReactive方法到dep.js这期间发生了什么：
- 创建【依赖类实例】 
- 将传入属性的值【有可能是对象，有可能是数组，各有各自的处理方法】丢给observe方法来创建【观察者实例】
- 往对象上用Object.defineProperty挂载属性，使该属性具有以下特点：1）在获取该属性时，会将当前【依赖类实例】添加到【依赖数组】；调用【观察者实例】的dep.depend方法 2）在设置该属性时，会将当前【赋的属性值】丢给observe方法来创建【观察者实例】
- 通知【订阅数组】里的每个【观察者实例项】进行更新
2. 从dep.js到watcher.js这期间发生了什么：
```
回顾一下，创建Vue实例时做了什么：
// instance/index.js
// 规定只能传构造函数，因为入面要对构造函数的原型做处理
initMixin(Vue)  
stateMixin(Vue) 
eventsMixin(Vue)  
lifecycleMixin(Vue)  
renderMixin(Vue)  

// instance/init.js 里的 initMixin方法
initLifecycle(vm)
initEvents(vm)
initRender(vm) <= 这里是我们正在分析的
callHook(vm, 'beforeCreate')
initInjections(vm) // resolve injections before data/props
initState(vm)
initProvide(vm) // resolve provide after data/props
callHook(vm, 'created')

// initLifecycle方法 和 initState方法都会通过new Watcher()创建观察者实例，这样pushTarget方法一直会被调用 => 这就保证了new Watcher().get()这个方法一直被调用 => Dep.target 一直被新的观察者实例覆盖赋值
// 好了我们可以去看Watcher.js的源码了。
```
0. 初始化【观察者实例】，发生了什么：
- 将当前【监听类实例】推到vue实例的_watchers数组属性
- 将传入参数挂载到【监听类实例】（其中包括有vue实例；有分别用于存放 1）依赖项 / 新依赖项 2）依赖项Id / 新依赖项Id 且保证项唯一的集合）
- 最后是根据this.lazy的值来判断是否调起【观察者类的get方法】
