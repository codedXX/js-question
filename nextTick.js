// ============================================================
// Vue3 nextTick 原理演示
// 新手向：用最通俗的语言 + 代码注释 帮你理解 nextTick
// ============================================================


// -------------------------------------------------------
// 第一步：理解"为什么需要 nextTick"
// -------------------------------------------------------
// 想象一个场景：
//   你在饭店点了很多菜（修改了很多数据），
//   厨师不会你每点一道菜就单独做一次，
//   而是等你点完所有菜，一起做，效率更高。
//
// Vue 也一样：
//   你改了 3 个数据 → Vue 不会立刻更新 3 次 DOM，
//   而是等你这波代码跑完，统一更新一次 DOM。
//
// 问题来了：
//   如果你改完数据，马上就想拿到"更新后的 DOM"，
//   直接拿是拿不到的（DOM 还没更新呢）！
//   这时候就需要 nextTick，告诉 Vue：
//   "等你更新完 DOM，再执行我这段代码"。


// -------------------------------------------------------
// 第二步：手写一个最简版 nextTick，帮你理解核心原理
// -------------------------------------------------------

// 【核心原理】：Promise.then 是"微任务"，
// 它会在当前同步代码跑完之后、下一次渲染之前执行。
// nextTick 就是把你的回调塞进 Promise.then 里。

function myNextTick(callback) {
  // Promise.resolve() 创建一个已完成的 Promise，
  // .then(callback) 让 callback 在"微任务"时机执行，
  // 也就是：等当前所有同步代码跑完后，再执行 callback。
  return Promise.resolve().then(callback)
}

// 演示：同步代码 vs 微任务的执行顺序
console.log('=== 演示执行顺序 ===')

console.log('① 同步：开始')

myNextTick(() => {
  console.log('③ 微任务：nextTick 里的回调（最后执行）')
})

console.log('② 同步：结束')

// 输出顺序：
// ① 同步：开始
// ② 同步：结束
// ③ 微任务：nextTick 里的回调（最后执行）
//
// 结论：nextTick 的回调，永远在当前同步代码执行完之后才跑！


// -------------------------------------------------------
// 第三步：手写一个带"任务队列合并"的 nextTick
// -------------------------------------------------------
// Vue 真正的 nextTick 还有一个优化：
// 如果你在同一时刻调用了多次 nextTick，
// Vue 会把所有回调收集起来，只创建一个 Promise，
// 批量执行，而不是创建很多个 Promise。

console.log('\n=== 演示队列合并 ===')

// 用一个数组来收集所有回调
const taskQueue = []
// 用一个标志位，避免重复创建 Promise
let isFlushing = false

function batchNextTick(callback) {
  // 把回调放进队列
  taskQueue.push(callback)

  // 如果还没有开始"冲刷"队列，就创建一个 Promise 来执行
  if (!isFlushing) {
    isFlushing = true

    Promise.resolve().then(() => {
      // 把队列里所有回调都执行一遍
      console.log(`一次性执行了 ${taskQueue.length} 个回调：`)
      while (taskQueue.length > 0) {
        const fn = taskQueue.shift() // 取出队列第一个
        fn()
      }
      // 执行完毕，重置标志位
      isFlushing = false
    })
  }
}

// 连续调用 3 次 nextTick，实际上只会创建 1 个 Promise
batchNextTick(() => console.log('  回调 A'))
batchNextTick(() => console.log('  回调 B'))
batchNextTick(() => console.log('  回调 C'))

// 输出：
// 一次性执行了 3 个回调：
//   回调 A
//   回调 B
//   回调 C


// -------------------------------------------------------
// 第四步：看 Vue3 源码是怎么做的（简化版）
// -------------------------------------------------------

// Vue3 的 nextTick 源码其实非常简单，核心只有几行：
//
// const resolvedPromise = Promise.resolve()
// let currentFlushPromise = null
//
// export function nextTick(fn) {
//   // currentFlushPromise 是 Vue 正在执行的那个"DOM更新 Promise"
//   // 如果 Vue 正在更新，就挂在它后面；否则用一个新的已完成 Promise
//   const p = currentFlushPromise || resolvedPromise
//
//   // 如果传了回调，就 .then(fn)；没传就返回 Promise（支持 await）
//   return fn ? p.then(fn) : p
// }
//
// 就这么简单！本质就是 Promise.then。


// -------------------------------------------------------
// 第五步：在 Vue 组件里怎么用（伪代码演示）
// -------------------------------------------------------

// 场景：点击按钮 → 修改数据 → 想立刻读取更新后的 DOM
//
// <template>
//   <div>
//     <p ref="msgEl">{{ message }}</p>
//     <button @click="handleClick">点击修改</button>
//   </div>
// </template>
//
// <script setup>
// import { ref, nextTick } from 'vue'
//
// const message = ref('旧内容')
// const msgEl = ref(null)
//
// async function handleClick() {
//   message.value = '新内容'   // 修改数据，但 DOM 还没更新！
//
//   // 错误做法 ❌：直接读，拿到的还是旧 DOM
//   console.log(msgEl.value.textContent)  // 输出：旧内容
//
//   // 正确做法 ✅：等 nextTick 后再读
//   await nextTick()
//   console.log(msgEl.value.textContent)  // 输出：新内容
//
//   // 或者用回调形式：
//   nextTick(() => {
//     console.log(msgEl.value.textContent)  // 输出：新内容
//   })
// }
// </script>


// -------------------------------------------------------
// 总结：三句话记住 nextTick
// -------------------------------------------------------
// 1. Vue 修改数据后，DOM 不会立刻更新，而是"等一下"再批量更新
// 2. nextTick 就是"等 DOM 更新完了，再执行你的代码"
// 3. 底层原理是 Promise.then（微任务），让回调在同步代码之后执行
