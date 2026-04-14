// ============================================================
// Vue3 nextTick 核心问题：
// "DOM 更新" 和 "nextTick 回调" 都用 Promise.then，
// 那凭什么 nextTick 一定在 DOM 更新之后执行？
// ============================================================


// -------------------------------------------------------
// 关键：Promise.then 的"链式"特性
// -------------------------------------------------------
// 先理解一个基础知识：Promise.then 是可以链式传递的，
// 后面 .then 的回调，一定在前面 .then 的回调执行完之后才执行。

const p = Promise.resolve()

p.then(() => console.log('第1个 then'))   // Vue 的 DOM 更新在这里
  .then(() => console.log('第2个 then'))   // nextTick 的回调在这里

// 输出永远是：
// 第1个 then
// 第2个 then
// 顺序不会乱！


// -------------------------------------------------------
// Vue3 的做法：用一个"共享 Promise" 串联所有操作
// -------------------------------------------------------
// Vue3 源码里有一个关键变量：currentFlushPromise
//
// 数据变化时，Vue 做的事：
//   currentFlushPromise = Promise.resolve().then(flushJobs)
//                                              ↑
//                                         这里面执行 DOM 更新
//
// 你调用 nextTick(fn) 时，Vue 做的事：
//   return currentFlushPromise.then(fn)
//                ↑                  ↑
//          链接在DOM更新后面      你的回调
//
// 因为你的回调是 .then 在 DOM 更新的 Promise 后面，
// 所以一定在 DOM 更新完成之后才执行！


// -------------------------------------------------------
// 用代码模拟这个过程，一眼看懂
// -------------------------------------------------------
console.log('=== 模拟 Vue3 内部执行过程 ===\n')

// 模拟 Vue3 内部的 currentFlushPromise
let currentFlushPromise = null

// 模拟"数据变化时 Vue 安排 DOM 更新"
function 模拟数据变化触发DOM更新() {
  console.log('① 数据变化了，Vue 把 DOM 更新安排进微任务队列')

  // Vue 内部：创建一个 Promise 来执行 DOM 更新
  // 并把它存起来，供 nextTick 使用
  currentFlushPromise = Promise.resolve().then(() => {
    // 【注意】这里的"DOM 更新"分两个阶段：
    //
    // 阶段一：JS 修改 DOM 属性（当前微任务里，立刻执行）
    //   例如：el.textContent = '新内容'
    //   执行完后，JS 读取 el.textContent 已经是新值了，
    //   但屏幕上用户肉眼还看不到变化。
    //
    // 阶段二：浏览器绘制（所有微任务跑完后，浏览器自己决定时机）
    //   浏览器把 DOM 的改动画到屏幕上，用户才真正看见新内容。
    //   这一步不在 JS 控制范围内，我们无法干预。
    //
    // 所以 nextTick 回调里能"读到"新 DOM，
    // 但用户"看到"新内容要再晚一步（浏览器绘制后）。
    console.log('③ DOM 属性已更新（JS可读），等待浏览器绘制到屏幕...')
    console.log('③ DOM 更新执行了！（flushJobs）')
    // DOM 更新完成后，把 currentFlushPromise 清空
    currentFlushPromise = null
  })
}

// 模拟 nextTick
function 模拟nextTick(callback) {
  // 关键！！！
  // 如果 Vue 正在安排 DOM 更新，就把回调"链"在它后面
  // 如果没有，就用一个新的 Promise（效果一样：等当前同步代码跑完）
  const p = currentFlushPromise || Promise.resolve()
  return p.then(callback)
}

// ---- 模拟用户操作 ----
模拟数据变化触发DOM更新()   // 用户改了数据

模拟nextTick(() => {
  console.log('④ nextTick 回调执行！此时 DOM 已更新完毕')
})

console.log('② 同步代码还在跑...')

// 输出顺序：
// ① 数据变化了，Vue 把 DOM 更新安排进微任务队列
// ② 同步代码还在跑...
// ③ DOM 更新执行了！（flushJobs）
// ④ nextTick 回调执行！此时 DOM 已更新完毕


// -------------------------------------------------------
// 用一张图理解整个流程
// -------------------------------------------------------
//
//  你的代码（同步）
//  ┌─────────────────────────────────────────────┐
//  │  this.msg = '新内容'                        │
//  │       ↓                                     │
//  │  Vue 内部：currentFlushPromise =            │
//  │    Promise.resolve().then(flushJobs)  ──┐   │
//  │                                         │   │
//  │  nextTick(fn)                           │   │
//  │    → currentFlushPromise.then(fn)  ──┐  │   │
//  │                                      │  │   │
//  │  console.log('同步代码跑完了')       │  │   │
//  └──────────────────────────────────────│──│───┘
//                                         │  │
//  微任务队列（按顺序执行）               │  │
//  ┌──────────────────────────────────────│──│───┐
//  │  1. flushJobs()  ←──────────────────┘  │   │
//  │     （更新 DOM）                         │   │
//  │                                         │   │
//  │  2. fn()  ←─────────────────────────────┘   │
//  │     （你的 nextTick 回调）                   │
//  └─────────────────────────────────────────────┘
//
//  关键：fn 是 .then 在 flushJobs 后面的，所以一定后执行！


// -------------------------------------------------------
// 如果不传 currentFlushPromise 会怎样？
// -------------------------------------------------------
// 如果你在数据变化之前就调用了 nextTick，
// 这时候 currentFlushPromise 还是 null，
// nextTick 就用 Promise.resolve() 兜底。
//
// 但这时候 DOM 更新和你的回调都是独立的 Promise，
// 谁先谁后取决于谁先进微任务队列。
//
// 所以通常 nextTick 要在数据变化之后调用，
// 才能保证拿到更新后的 DOM。
//
// ✅ 正确用法：
//   this.msg = '新内容'
//   nextTick(() => { /* 读 DOM */ })
//
// ⚠️ 不保险的用法（nextTick 在数据变化之前）：
//   nextTick(() => { /* 读 DOM */ })  // 可能拿不到最新 DOM
//   this.msg = '新内容'


// -------------------------------------------------------
// 用最简单的一句话总结
// -------------------------------------------------------
// DOM 更新和 nextTick 都用 Promise.then，
// 但 nextTick 的回调是 .then 在 DOM 更新的 Promise 后面的，
// 就像排队，DOM 更新排前面，你的回调排后面，顺序固定！
