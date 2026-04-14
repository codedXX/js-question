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


// ============================================================
// 2. 数据验证 —— set 陷阱做类型校验
// ============================================================
console.log('\n===== 2. 数据验证 =====')

const product = { name: '苹果', price: 10, stock: 100 }

const productProxy = new Proxy(product, {
  set(target, key, value) {
    if (key === 'price' && (typeof value !== 'number' || value < 0)) {
      throw new TypeError(`price 必须是非负数，收到的值: ${value}`)
    }
    if (key === 'stock' && (!Number.isInteger(value) || value < 0)) {
      throw new TypeError(`stock 必须是非负整数，收到的值: ${value}`)
    }
    target[key] = value
    return true
  }
})

productProxy.price = 15            // 正常设置
console.log('price:', productProxy.price)

try {
  productProxy.price = -5          // 抛出错误
} catch (e) {
  console.log('错误:', e.message)
}

try {
  productProxy.stock = 1.5         // 抛出错误
} catch (e) {
  console.log('错误:', e.message)
}


// ============================================================
// 3. has 陷阱 —— 拦截 in 运算符
// ============================================================
console.log('\n===== 3. has 陷阱（拦截 in 运算符）=====')

const range = { min: 1, max: 100 }

const rangeProxy = new Proxy(range, {
  // has 陷阱让 in 运算符判断"数字是否在范围内"
  has(target, key) {
    const num = Number(key)
    return num >= target.min && num <= target.max
  }
})

console.log(50 in rangeProxy)    // true
console.log(200 in rangeProxy)   // false
console.log(1 in rangeProxy)     // true


// ============================================================
// 4. deleteProperty 陷阱 —— 拦截 delete 操作
// ============================================================
console.log('\n===== 4. deleteProperty 陷阱 =====')

const config = { host: 'localhost', port: 3000, secret: 'abc123' }

const configProxy = new Proxy(config, {
  deleteProperty(target, key) {
    if (key === 'secret') {
      console.log(`[保护] 禁止删除敏感属性: ${key}`)
      return false // 返回 false 表示删除失败（严格模式下会抛出 TypeError）
    }
    console.log(`[DELETE] 删除属性: ${key}`)
    delete target[key]
    return true
  }
})

delete configProxy.port    // 正常删除
console.log('port' in configProxy)    // false
delete configProxy.secret  // 被拦截，删除失败
console.log('secret' in configProxy)  // true，仍然存在


// ============================================================
// 5. apply 陷阱 —— 拦截函数调用
// ============================================================
console.log('\n===== 5. apply 陷阱（拦截函数调用）=====')

function add(a, b) {
  return a + b
}

const addProxy = new Proxy(add, {
  apply(target, thisArg, args) {
    console.log(`[CALL] 调用函数，参数: ${args}`)
    const result = target.apply(thisArg, args)
    console.log(`[CALL] 返回结果: ${result}`)
    return result
  }
})

addProxy(3, 5)   // 触发 apply 陷阱
addProxy(10, 20)


// ============================================================
// 6. Vue3 响应式原理简化版 —— 用 Proxy 实现 reactive
// ============================================================
console.log('\n===== 6. 模拟 Vue3 reactive =====')

// 存储依赖：{ target -> { key -> Set<effect> } }
const targetMap = new WeakMap()
let activeEffect = null  // 当前正在执行的副作用函数

// 追踪依赖
function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))
  dep.add(activeEffect)
}

// 触发更新
function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  const dep = depsMap.get(key)
  if (dep) dep.forEach(effect => effect())
}

// 简化版 reactive
function reactive(raw) {
  return new Proxy(raw, {
    get(target, key) {
      track(target, key)       // 收集依赖
      return Reflect.get(target, key)
    },
    set(target, key, value) {
      Reflect.set(target, key, value)
      trigger(target, key)     // 触发更新
      return true
    }
  })
}

// 简化版 watchEffect
function watchEffect(fn) {
  activeEffect = fn
  fn()               // 首次执行，触发 get，收集依赖
  activeEffect = null
}

// --- 使用 ---
const state = reactive({ count: 0, msg: 'Hello' })

watchEffect(() => {
  console.log(`[副作用] count 变了: ${state.count}`)
})

watchEffect(() => {
  console.log(`[副作用] msg 变了: ${state.msg}`)
})

state.count++        // 触发 count 的副作用
state.count++        // 再次触发
state.msg = 'Vue3'   // 触发 msg 的副作用
state.count = 10     // 只触发 count 的副作用，msg 副作用不执行


// ============================================================
// 7. Reflect —— Proxy 最佳搭档
// ============================================================
console.log('\n===== 7. Proxy + Reflect =====')
/**
 * Reflect 提供了与 Proxy 陷阱一一对应的静态方法。
 * 在陷阱中用 Reflect.xxx 调用原始行为，比直接操作 target 更安全，
 * 能正确处理 this 绑定和继承场景。
 */

const obj = {
  _name: 'Vue',
  get label() {
    return `框架: ${this._name}`  // this 需要正确指向代理对象
  }
}

// ❌ 错误写法：直接访问 target[key]，this 指向原始对象，拦截不到 _name 的读取
const badProxy = new Proxy(obj, {
  get(target, key) {
    return target[key]  // getter 里的 this 是 target（原始对象），不会再经过代理
  }
})

// ✅ 正确写法：用 Reflect.get 并传入 receiver（代理对象本身）
const goodProxy = new Proxy(obj, {
  get(target, key) {
    console.log(`[GET] ${key}`)
    return Reflect.get(target, key, goodProxy)  // receiver 是代理，确保 getter 里 this = 代理
  }
})

console.log('label via goodProxy:', goodProxy.label)
// 会依次触发: label -> _name 的 get 陷阱（因为 this 指向代理）
