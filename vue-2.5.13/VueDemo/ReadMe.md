## 总结render.js -> observer/index.js -> dep.js -> watch.js
从render.js里的defineReactive方法，找到其来自于【observer/index.js总观察者模块】，【总观察者模块】又会去调用【依赖模块dep.js】的方法来对【当前依赖实例】跟【观察者实例】做绑定，然后将其存放到【观察者实例】的新依赖项集合，最后将【观察者实例】存放到【依赖实例的订阅数组】里。

> Dep.target在initLifecycle 和 initState这两个时刻，会被【观察者实例】赋值，源码里涉及到调用Dep.target的方法都是在调用【观察者实例】的方法 => 可以看出Watcher类跟Dep类是各自调用对方的方法

0. 在render阶段，有两个属性：$attrs和$listeners。这两个属性通过defineReactive方法挂载到vue实例上。

1. 从defineReactive方法到dep.js这期间发生了什么：
- 创建【依赖类实例】 
- 将传入属性的值【有可能是对象，有可能是数组，各有各自的处理方法】丢给observe方法来创建【观察者实例】 - observer是辅助方法，其调用辅助类Observer，创建【观察者实例】
- 往对象上用Object.defineProperty挂载属性，使该属性具有以下特点：1）在获取该属性时，会将【当前依赖实例】添加到【观察者实例数组】；然后将【观察者实例】添加到【依赖实例的订阅数组】 2）在设置该属性时，会将当前【赋的属性值】丢给observe方法来创建【观察者实例】；然后通知【依赖实例的订阅数组】里的每个【观察者实例项】进行更新

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

// initLifecycle方法 和 initState方法都会通过new Watcher()创建观察者实例，这样pushTarget方法一直会被调用 => 这就保证了new Watcher().get()这个方法一直被调用 => Dep.target 一直被【新的观察者实例】覆盖赋值
```

* 疑问：其实Watcher跟Dep、Observer之间是什么关系？ --- 20180515
1.Dep类跟Watch类两者之间互相绑定，之间的方法互相调用
2.Observe类作为辅助函数，用于给对象做数据劫持进行赋值
3.任何时刻只存在一个Watcher类