/**
 * Proxy 完整 Demo
 * Proxy 是 ES6 引入的特性，Vue3 的响应式系统（reactive）就是基于它实现的。
 * Proxy 可以拦截并自定义对象的基本操作（读取、赋值、删除等）。
 *
 * 基本语法：new Proxy(target, handler)
 *   - target：被代理的原始对象
 *   - handler：拦截器对象，包含各种"陷阱（trap）"方法
 */

// ============================================================
// 1. 最简单的 Proxy —— 读写拦截
// ============================================================
console.log('===== 1. 基础读写拦截 =====')

const user = { name: '张三', age: 18 }

const userProxy = new Proxy(user, {
  // get 陷阱：拦截属性读取
  get(target, key) {
    console.log(`[GET] 读取属性: ${key}`)
    return key in target ? target[key] : `属性 "${key}" 不存在`
  },
  // set 陷阱：拦截属性赋值
  set(target, key, value) {
    console.log(`[SET] 设置属性: ${key} = ${value}`)
    target[key] = value
    return true // 必须返回 true，表示赋值成功
  }
})

console.log(userProxy.name)      // 触发 get
console.log(userProxy.email)     // 触发 get，属性不存在时返回提示
userProxy.age = 20               // 触发 set
console.log(userProxy.age)       // 触发 get，输出 20