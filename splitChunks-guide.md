# Webpack splitChunks 详解

## 一、先理解问题：为什么需要代码分割？

### 没有代码分割时

想象你的项目打包后只有一个文件 `bundle.js`：

```
bundle.js (5MB)
  ├── Vue 框架代码
  ├── Element UI 组件库
  ├── ECharts 图表库
  ├── 你写的所有页面代码
  └── 所有工具函数
```

用户打开网站时，浏览器必须把这 5MB **全部下载完**才能显示页面。
哪怕用户只是想看登录页，也要等图表库、表格库全部加载完。

### 有了代码分割之后

```
runtime.js        (1KB)   ← 每次都要加载，但很小
chunk-libs.js     (800KB) ← 第三方基础库，长期缓存
chunk-elementUI.js(500KB) ← Element UI，长期缓存
chunk-echarts.js  (400KB) ← 只在图表页才加载
login.js          (10KB)  ← 登录页代码
dashboard.js      (20KB)  ← 首页代码
orders.js         (30KB)  ← 订单页代码
...
```

用户打开登录页时，只需下载 `runtime.js` + `chunk-libs.js` + `login.js`，
图表库等到用户真正进入图表页时才下载。

> **核心收益**：首屏变快 + 利用浏览器缓存（库文件不变就不用重新下载）

---

## 二、splitChunks 的基本概念

### 什么是 Chunk？

Chunk 就是 webpack 打包后生成的 **JS 文件**。有两种来源：

```
初始 chunk (initial)：入口文件直接引入的代码
  main.js → import Vue → import ElementUI → ... → 打包成初始 chunk

异步 chunk (async)：懒加载引入的代码
  router: () => import('@/views/orders/index')  → 打包成异步 chunk
```

### splitChunks 做了什么？

它分析所有 chunk，找出**被多个 chunk 共同依赖**的模块，
把这些模块单独提取出来，避免重复打包。

**示意图：**

```
优化前：
  页面A.js  包含: [Vue, ElementUI, 工具函数, 页面A自己的代码]
  页面B.js  包含: [Vue, ElementUI, 工具函数, 页面B自己的代码]
  页面C.js  包含: [Vue, ElementUI, 工具函数, 页面C自己的代码]
  → Vue 和 ElementUI 被打包了 3 次，浪费！

优化后：
  chunk-libs.js    包含: [Vue, ElementUI, 工具函数]  ← 共享，只下载一次
  页面A.js         包含: [页面A自己的代码]
  页面B.js         包含: [页面B自己的代码]
  页面C.js         包含: [页面C自己的代码]
```

---

## 三、配置项详解

```js
config.optimization.splitChunks({
  chunks: 'all',        // 对所有类型的 chunk 生效
  cacheGroups: {        // 分组规则，每组对应一个输出文件
    groupA: { ... },
    groupB: { ... },
  }
})
```

### `chunks` 的三个值

| 值 | 含义 |
|---|---|
| `'initial'` | 只处理初始 chunk（同步 import） |
| `'async'`   | 只处理异步 chunk（懒加载 import()） |
| `'all'`     | 全部处理（推荐，覆盖范围最广） |

**演示差异：**

```js
// main.js（入口文件）
import ElementUI from 'element-ui'  // 同步引入 → initial chunk

// router/index.js
{
  component: () => import('@/views/orders')  // 懒加载 → async chunk
}
```

```
chunks: 'initial' → 只会把 ElementUI 提取出来，orders 页面里的 node_modules 不管
chunks: 'all'     → ElementUI 和 orders 里用到的 node_modules 都会被提取
```

---

### `cacheGroups` 分组配置

每个分组就是一条"提取规则"，常用字段：

```js
cacheGroups: {
  myGroup: {
    name: 'chunk-my-group',   // 输出的文件名
    test: /规则/,              // 匹配哪些模块
    priority: 10,             // 优先级（数字越大越优先）
    chunks: 'async',          // 覆盖顶层 chunks 设置
    minChunks: 2,             // 至少被几个 chunk 引用才提取（默认1）
    reuseExistingChunk: true, // 如果模块已在某个 chunk 里，直接复用
  }
}
```

#### `test` 字段 — 匹配规则

```js
// 匹配 node_modules 下的所有模块
test: /[\\/]node_modules[\\/]/

// 匹配 node_modules 下的 element-ui（兼容 cnpm 的 _element-ui 写法）
test: /[\\/]node_modules[\\/]_?element-ui(.*)/

// 匹配 src/components 目录
test: resolve('src/components')
```

#### `priority` 字段 — 优先级

当一个模块**同时满足多个分组**的规则时，`priority` 大的那个组"抢走"它。

```
举例：echarts 在 node_modules 里
  → 满足 chunk-libs  的规则（priority: 10）
  → 满足 chunk-echarts 的规则（priority: 40）
  → priority 40 > 10，echarts 归入 chunk-echarts ✓
```

#### `minChunks` 字段 — 最少引用次数

```js
commons: {
  name: 'chunk-commons',
  test: resolve('src/components'),
  minChunks: 3,  // 某个组件至少被 3 个页面引用，才提取出来
  priority: 5
}
```

如果一个组件只在 1-2 个页面用，提取出来反而增加请求数，得不偿失。

#### `reuseExistingChunk` 字段

```js
reuseExistingChunk: true
```

如果模块 A 已经被打包进了某个 chunk，其他地方需要它时直接引用那个 chunk，
不会重复打包一份。推荐始终开启。

---

## 四、完整 Demo 演示

### 项目结构（假设）

```
src/
  main.js              ← 同步引入 Vue、ElementUI
  views/
    login.vue          ← 懒加载
    dashboard.vue      ← 懒加载，用了 ECharts
    orders.vue         ← 懒加载，用了 xlsx
    products.vue       ← 懒加载，用了 xlsx
```

### 没有 splitChunks 时的产物

```
main.js       (3.2MB) Vue + ElementUI + ECharts + xlsx + 登录页 + 首页 + 订单页 + 商品页
```

### 加上 splitChunks 配置

```js
config.optimization.splitChunks({
  chunks: 'all',
  cacheGroups: {
    // 规则1：提取所有 node_modules（兜底）
    libs: {
      name: 'chunk-libs',
      test: /[\\/]node_modules[\\/]/,
      priority: 10,
      chunks: 'all'
    },
    // 规则2：单独提取 Element UI
    elementUI: {
      name: 'chunk-elementUI',
      test: /[\\/]node_modules[\\/]_?element-ui(.*)/,
      priority: 20   // > 10，从 chunk-libs 里"抢走" element-ui
    },
    // 规则3：单独提取 ECharts（异步）
    echarts: {
      name: 'chunk-echarts',
      test: /[\\/]node_modules[\\/]_?echarts(.*)/,
      priority: 40,
      chunks: 'async',
      reuseExistingChunk: true
    },
    // 规则4：单独提取 xlsx（异步）
    xlsx: {
      name: 'chunk-xlsx',
      test: /[\\/]node_modules[\\/]_?xlsx(.*)/,
      priority: 40,
      chunks: 'async',
      reuseExistingChunk: true
    }
  }
})
```

### 产物变化

```
打包产物：
  runtime.js         (2KB)    ← webpack 运行时，内联进 HTML
  chunk-libs.js      (400KB)  ← Vue、axios 等基础库
  chunk-elementUI.js (500KB)  ← Element UI
  chunk-echarts.js   (400KB)  ← ECharts（只在 dashboard 加载时才下载）
  chunk-xlsx.js      (700KB)  ← xlsx（orders 和 products 共享这一份）
  login.js           (8KB)    ← 登录页自己的代码
  dashboard.js       (15KB)   ← 首页自己的代码
  orders.js          (20KB)   ← 订单页自己的代码
  products.js        (18KB)   ← 商品页自己的代码
```

### 用户访问流程

```
用户打开登录页：
  下载: runtime.js + chunk-libs.js + chunk-elementUI.js + login.js
  不下载: ECharts、xlsx（用不到）

用户进入首页（有图表）：
  下载: chunk-echarts.js + dashboard.js
  不下载: xlsx（还用不到）

用户进入订单页：
  下载: chunk-xlsx.js + orders.js
  不下载: ECharts（已经下载了的不用重复下）

用户进入商品页：
  下载: products.js
  chunk-xlsx.js 已缓存，直接用！✓
```

---

## 五、常见误区

### 误区1：分割越多越好

```
❌ 错误做法：每个组件都单独拆一个 chunk
   结果：产生几百个 JS 文件，HTTP 请求数量爆炸，反而更慢

✅ 正确做法：对体积大（>50KB）且多页面共用的库才单独拆分
```

### 误区2：chunks: 'initial' 足够了

```js
// 假设 orders.vue 里
import xlsx from 'xlsx'  // orders.vue 是懒加载的，所以这里是异步 chunk

// 如果 chunk-libs 配置了 chunks: 'initial'
// → xlsx 不会被提取到 chunk-libs
// → orders.js 和 products.js 各自打包一份 xlsx，700KB × 2 = 1.4MB 浪费！

// 改为 chunks: 'all' 才能正确提取
```

### 误区3：test 指向不存在的目录

```js
// ❌ 目录根本不存在，这条规则永远不会命中，纯属浪费配置
'project-components': {
  test: resolve('src/views/project'),  // 这个目录不存在！
  ...
}
```

---

## 六、如何验证分割效果？

安装分析工具：

```bash
npm install --save-dev webpack-bundle-analyzer
```

在 `vue.config.js` 中临时添加：

```js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

configureWebpack: {
  plugins: [
    new BundleAnalyzerPlugin()  // 打包后自动打开可视化报告
  ]
}
```

运行打包后会弹出一个网页，用色块展示每个 chunk 的构成和大小，
一眼看出哪些库体积大、有没有被重复打包。

---

## 七、本项目当前配置说明

```js
// vue.config.js 当前生效的规则（优先级从低到高）

priority 5  → chunk-commons    src/components 下被 ≥3 个页面引用的公共组件
priority 10 → chunk-libs       所有 node_modules（兜底）
priority 20 → chunk-elementUI  Element UI（从 chunk-libs 里单独抽出）
priority 40 → chunk-echarts    ECharts（异步，图表页才下载）
priority 40 → chunk-xlsx       xlsx（异步，导出页才下载）
```

当一个模块同时符合多条规则，priority 最大的那条生效。
