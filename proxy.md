# Proxy 学习文档

> 对应代码：[proxy.js](./proxy.js)
> 运行方式：`node proxy.js`

## 什么是 Proxy

Proxy 是 ES6 引入的内置对象，用于**拦截并自定义对象的基本操作**（读取属性、赋值、删除、函数调用等）。

Vue3 的响应式系统（`reactive()`）就是基于 Proxy 实现的。

**基本语法：**

```js
const proxy = new Proxy(target, handler)
```

| 参数 | 说明 |
|------|------|
| `target` | 被代理的原始对象（可以是对象、数组、函数） |
| `handler` | 拦截器对象，包含各种"陷阱（trap）"方法 |

> 操作 `proxy` 时，handler 中对应的陷阱会被触发；若陷阱未定义，则直接透传到 `target`。

---

## 常用陷阱（Trap）一览

| 陷阱方法 | 触发时机 | 对应操作 |
|----------|----------|----------|
| `get(target, key)` | 读取属性 | `proxy.key` |
| `set(target, key, value)` | 设置属性 | `proxy.key = value` |
| `has(target, key)` | `in` 运算符 | `key in proxy` |
| `deleteProperty(target, key)` | 删除属性 | `delete proxy.key` |
| `apply(target, thisArg, args)` | 函数调用 | `proxy()` |
| `construct(target, args)` | `new` 调用 | `new proxy()` |

---

## 1. 基础读写拦截

`get` 和 `set` 是最常用的两个陷阱，可以监控属性的读取与赋值。

```js
const user = { name: '张三', age: 18 }

const userProxy = new Proxy(user, {
  get(target, key) {
    console.log(`[GET] 读取属性: ${key}`)
    return key in target ? target[key] : `属性 "${key}" 不存在`
  },
  set(target, key, value) {
    console.log(`[SET] 设置属性: ${key} = ${value}`)
    target[key] = value
    return true  // set 陷阱必须返回 true，否则严格模式会报错
  }
})

userProxy.name       // [GET] 读取属性: name  →  '张三'
userProxy.email      // [GET] 读取属性: email →  '属性 "email" 不存在'
userProxy.age = 20   // [SET] 设置属性: age = 20
```

**注意：`set` 必须 `return true`**，表示赋值成功。在严格模式下，返回 `false` 或不返回会抛出 `TypeError`。

---

## 2. 数据验证

在 `set` 陷阱中加入校验逻辑，可以保证对象属性始终合法，比 TypeScript 类型更"运行时"。

```js
const productProxy = new Proxy({ price: 10, stock: 100 }, {
  set(target, key, value) {
    if (key === 'price' && (typeof value !== 'number' || value < 0)) {
      throw new TypeError(`price 必须是非负数`)
    }
    if (key === 'stock' && (!Number.isInteger(value) || value < 0)) {
      throw new TypeError(`stock 必须是非负整数`)
    }
    target[key] = value
    return true
  }
})

productProxy.price = 15   // 正常
productProxy.price = -5   // 抛出 TypeError
productProxy.stock = 1.5  // 抛出 TypeError
```

**适用场景：** 表单数据对象、配置对象的合法性保证、接口入参校验。

---

## 3. `has` 陷阱——拦截 `in` 运算符

`has` 陷阱可以改变 `in` 运算符的语义，不再只是"属性是否存在"，而是自定义任意包含逻辑。

```js
const range = { min: 1, max: 100 }

const rangeProxy = new Proxy(range, {
  has(target, key) {
    const num = Number(key)
    return num >= target.min && num <= target.max
  }
})

50  in rangeProxy  // true
200 in rangeProxy  // false
1   in rangeProxy  // true
```

**适用场景：** 区间判断、权限集合、黑白名单检查。

---

## 4. `deleteProperty` 陷阱——拦截 `delete`

可以阻止某些关键属性被删除，保护对象完整性。

```js
const configProxy = new Proxy({ host: 'localhost', port: 3000, secret: 'abc123' }, {
  deleteProperty(target, key) {
    if (key === 'secret') {
      console.log(`禁止删除敏感属性: ${key}`)
      return false  // 严格模式下会抛出 TypeError
    }
    delete target[key]
    return true
  }
})

delete configProxy.port    // 成功
delete configProxy.secret  // 被拦截，secret 仍然存在
```

**适用场景：** 保护配置中的敏感字段、不可变对象的模拟。

---

## 5. `apply` 陷阱——拦截函数调用

当被代理的 `target` 是函数时，`apply` 陷阱会在函数被调用时触发。

```js
function add(a, b) { return a + b }

const addProxy = new Proxy(add, {
  apply(target, thisArg, args) {
    console.log(`调用参数: ${args}`)
    const result = target.apply(thisArg, args)
    console.log(`返回结果: ${result}`)
    return result
  }
})

addProxy(3, 5)   // 调用参数: 3,5  |  返回结果: 8
addProxy(10, 20) // 调用参数: 10,20  |  返回结果: 30
```

**适用场景：** 函数调用日志、参数校验、权限控制、性能计时。

---

## 6. 模拟 Vue3 `reactive` 响应式原理

Vue3 响应式的核心就是 Proxy + 依赖收集，可以用不到 40 行代码还原其原理。

### 数据结构

```
targetMap (WeakMap)
  └── target (原始对象)
        └── depsMap (Map)
              └── key (属性名)
                    └── dep (Set<effect函数>)
```

### 核心实现

```js
const targetMap = new WeakMap()
let activeEffect = null

// 收集依赖：把当前副作用函数与 target.key 绑定
function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))
  dep.add(activeEffect)
}

// 触发更新：执行所有依赖 target.key 的副作用函数
function trigger(target, key) {
  const dep = targetMap.get(target)?.get(key)
  dep?.forEach(effect => effect())
}

function reactive(raw) {
  return new Proxy(raw, {
    get(target, key) {
      track(target, key)              // 读属性时收集依赖
      return Reflect.get(target, key)
    },
    set(target, key, value) {
      Reflect.set(target, key, value)
      trigger(target, key)            // 写属性时触发更新
      return true
    }
  })
}

function watchEffect(fn) {
  activeEffect = fn
  fn()            // 首次执行，触发 get，完成依赖收集
  activeEffect = null
}
```

### 使用效果

```js
const state = reactive({ count: 0, msg: 'Hello' })

watchEffect(() => console.log('count:', state.count))  // 立即输出 count: 0
watchEffect(() => console.log('msg:', state.msg))      // 立即输出 msg: Hello

state.count++    // 只触发 count 的副作用
state.msg = 'Vue3'  // 只触发 msg 的副作用
```

### 执行流程图

```
watchEffect(fn)
  │
  ├─ activeEffect = fn
  ├─ fn() 执行
  │    └─ 读取 state.count  →  触发 get 陷阱
  │         └─ track(target, 'count')
  │              └─ dep(count).add(fn)   ← 依赖收集完成
  └─ activeEffect = null

state.count = 1
  └─ 触发 set 陷阱
       └─ trigger(target, 'count')
            └─ dep(count).forEach(fn => fn())  ← 副作用重新执行
```

---

## 7. Proxy 与 Reflect 配合使用

### 为什么要用 Reflect？

在 `get` 陷阱中，如果直接返回 `target[key]`，当对象有 getter 时，getter 内部的 `this` 会指向**原始对象**而非**代理对象**，导致 getter 中的属性访问绕过代理。

```js
const obj = {
  _name: 'Vue',
  get label() {
    return `框架: ${this._name}`  // this 指向谁很关键
  }
}
```

**错误写法：`target[key]`**

```js
const badProxy = new Proxy(obj, {
  get(target, key) {
    return target[key]
    // label getter 执行时，this = target（原始对象）
    // 访问 this._name 不经过代理，track() 不会被调用
  }
})
```

**正确写法：`Reflect.get(target, key, receiver)`**

```js
const goodProxy = new Proxy(obj, {
  get(target, key) {
    // receiver 是代理对象本身，确保 getter 里 this = 代理
    return Reflect.get(target, key, goodProxy)
    // label getter 执行时，this = goodProxy
    // 访问 this._name 会再次触发 get 陷阱，track() 正常收集
  }
})
```

### Proxy 陷阱与 Reflect 方法对照表

| Proxy 陷阱 | 对应 Reflect 方法 |
|------------|------------------|
| `get(target, key, receiver)` | `Reflect.get(target, key, receiver)` |
| `set(target, key, value, receiver)` | `Reflect.set(target, key, value, receiver)` |
| `has(target, key)` | `Reflect.has(target, key)` |
| `deleteProperty(target, key)` | `Reflect.deleteProperty(target, key)` |
| `apply(target, thisArg, args)` | `Reflect.apply(target, thisArg, args)` |

**经验法则：** 陷阱内部调用原始行为时，统一用 `Reflect.xxx`，并透传 `receiver`。

---

## 总结

| 知识点 | 一句话 |
|--------|--------|
| `get` / `set` | 拦截读写，是 Vue3 响应式的基础 |
| `has` | 让 `in` 运算符支持自定义逻辑 |
| `deleteProperty` | 保护对象属性不被意外删除 |
| `apply` | 拦截函数调用，适合日志/权限/计时 |
| `reactive` 原理 | `get` 收集依赖，`set` 触发更新 |
| `Reflect` | 在陷阱内调用原始行为，正确处理 `this` 和继承 |
