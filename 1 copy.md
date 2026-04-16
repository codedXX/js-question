问题：chunks为`'initial'`是什么意思，什么叫初始chunk?
初始 chunk = 进页面就要下载的 JS；异步 chunk = 跳转路由时才下载的 JS。chunks: 'initial' 只优化前者，chunks: 'all' 两个都优化。



问题：chunks为`'initial'`提取出来初始chunk里的某些代码，其他的chunk就不去提取了是吗?
'initial' 只看初始 chunk，异步 chunk 里的代码它直接跳过不处理。

问题：那异步的页面可以用这个初始提取出来的chunk吗？
可以，这正是代码分割的核心价值之一。

提取出来的 chunk 是共享的，不管是初始页面还是异步页面都能用。

用图说明

chunk-libs.js（从初始 chunk 里提取出来的）
  包含：Vue、axios、js-cookie...

main.js（初始，直接用）
  → 页面加载时下载 chunk-libs.js ✓

orders.vue（异步，懒加载进来）
  → 也用 Vue、axios
  → 不会重新打包一份，直接复用已下载的 chunk-libs.js ✓
浏览器加载流程：


1. 用户打开页面
   下载 chunk-libs.js → 浏览器缓存起来

2. 用户跳转到订单页
   下载 orders.js（只有订单页自己的代码）
   需要 Vue/axios → 直接用缓存里的 chunk-libs.js，不重新下载
但这里有一个微妙的问题
chunks: 'initial' 提取 chunk-libs 时，只保证初始 chunk 里的重复代码被提取出来。

如果一个库只在异步 chunk 里用，没有出现在初始 chunk 里：


xlsx 只在 orders.vue 和 products.vue（都是异步）里用
main.js 里没有 import xlsx

chunks: 'initial' → 不提取 xlsx
结果：orders.js 里打一份 xlsx，products.js 里又打一份 xlsx

虽然 orders.js 加载后 xlsx 被缓存了，
但 products.js 里仍然包含了一份完整的 xlsx 代码，体积是浪费的
所以改成 chunks: 'all' 之后：


xlsx 在两个异步 chunk 里都有 → 提取为 chunk-xlsx.js
orders.js   不含 xlsx，体积变小
products.js 不含 xlsx，体积变小
两个页面共用 chunk-xlsx.js ✓
一句话：提取出来的 chunk 所有人都能共享复用，'initial' 只是决定"哪些模块有资格被提取"，不影响提取后的共享能力。

问题：只有在orders.vue的script有import vue from 'vue'和import axios from 'axios'了才算引入了vue和axios吗？


不需要显式写出来，间接依赖也算。

webpack 分析的是"依赖树"，不只是你直接写的 import

orders.vue 里你只写了：
  import orderApi from '@/api/orders'

但 webpack 会继续追踪：
  @/api/orders.js
    └── import request from '@/utils/request'
          └── import axios from 'axios'   ← 找到了 axios！

所以 webpack 认为 orders.vue 间接依赖了 axios
Vue 更典型
你的每个 .vue 文件里几乎都没有写 import Vue from 'vue'，但 webpack 知道：


orders.vue
  → vue-loader 编译 .vue 文件时，内部会引用 Vue 运行时
  → 所以每个 .vue 文件都间接依赖了 Vue

你不需要手动写，webpack 自动能追踪到
结论
webpack 在打包时会把整棵依赖树都分析清楚：


orders.vue
  ├── @/api/orders.js
  │     └── @/utils/request.js
  │           └── axios          ← 间接依赖
  ├── element-ui/button          ← 间接依赖
  ├── vue（通过 vue-loader）     ← 间接依赖
  └── xlsx（你直接写的）         ← 直接依赖
不管是直接 import 还是间接引用，只要最终用到了，webpack 都能分析到，splitChunks 也都能提取。

那全局的axios.js和vue.js这种怎么算？
好问题，这里要分两种情况。

情况一：通过 CDN 引入（script 标签）

<!-- index.html -->
<script src="https://cdn.xxx.com/vue.min.js"></script>
<script src="https://cdn.xxx.com/axios.min.js"></script>
这种情况 webpack 完全不知道它们的存在，打包时不会把 Vue/axios 打进 bundle，也不参与 splitChunks 分析。

需要配合 externals 告诉 webpack：


// vue.config.js
configureWebpack: {
  externals: {
    'vue': 'Vue',     // 遇到 import Vue from 'vue' 时，去全局变量 window.Vue 找
    'axios': 'axios'
  }
}
这样代码里写 import Vue from 'vue' 照常写，但打包时 webpack 不会把 Vue 打进去，运行时去 CDN 加载的全局变量里取。

情况二：在 main.js 里挂载到全局

// main.js
import Vue from 'vue'
import axios from 'axios'

Vue.prototype.$axios = axios   // 挂到全局
这种情况 webpack 完全知道，因为 main.js 是入口文件，import axios 是同步引入，axios 会被打进初始 chunk。

其他页面虽然用 this.$axios 调用，但 webpack 追踪的是 import 语句，不是运行时的 this.xxx——所以 axios 的依赖关系在 main.js 里就已经确定了。


main.js (初始 chunk)
  └── import axios          ← webpack 在这里记录了 axios 的依赖

orders.vue 用 this.$axios
  → webpack 不会因为 this.$axios 再记录一次 axios
  → axios 只在 main.js 里被引用过一次，归入初始 chunk
  → splitChunks 把它提取进 chunk-libs.js
  → orders.vue 运行时从 chunk-libs.js 里取到 axios ✓
本项目的情况
你们项目里 main.js 同步引入了 Vue、ElementUI、Vuex、VueRouter，这些都属于初始 chunk，会被 splitChunks 正确提取。

axios 是在 src/utils/request.js 里引入的，每个调接口的页面都间接依赖它，webpack 同样能追踪到。