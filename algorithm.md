# 前端常用算法及应用场景

## 1. 排序算法

| 算法 | 时间复杂度 | 前端应用场景 |
|------|-----------|------------|
| 快速排序 | O(n log n) | 大数据列表排序 |
| 归并排序 | O(n log n) | 稳定排序需求（如保留相同项顺序） |
| 插入排序 | O(n²) | 小数据量/基本有序的列表 |
| 桶排序 | O(n+k) | 按时间段分组展示数据 |

**场景举例：** 电商商品按价格/销量排序、表格列排序、任务优先级排列。

---

## 2. 搜索算法

- **二分查找** O(log n)：有序列表中快速定位，如虚拟滚动中查找目标 item 位置
- **DFS/BFS**：树形菜单、权限树遍历、路由查找
- **字符串匹配（KMP/Trie）**：搜索框关键词高亮、自动补全

```js
// 二分查找
function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}
```

---

## 3. 树相关算法

> 场景：组织架构图、文件目录树、JSON 树形结构、菜单渲染

- **树的遍历**（前序/中序/后序）：DOM 树操作、递归渲染组件树
- **最低公共祖先（LCA）**：路由面包屑生成
- **树与数组互转**：后端返回平铺数组转为树形结构（构建菜单常用）

```js
// 平铺数组转树形结构
function buildTree(list) {
  const map = {};
  const roots = [];
  list.forEach(item => (map[item.id] = { ...item, children: [] }));
  list.forEach(item => {
    if (item.parentId) map[item.parentId].children.push(map[item.id]);
    else roots.push(map[item.id]);
  });
  return roots;
}

// DFS 深度优先遍历
function dfs(node, result = []) {
  result.push(node.id);
  (node.children || []).forEach(child => dfs(child, result));
  return result;
}

// BFS 广度优先遍历
function bfs(root) {
  const queue = [root];
  const result = [];
  while (queue.length) {
    const node = queue.shift();
    result.push(node.id);
    (node.children || []).forEach(child => queue.push(child));
  }
  return result;
}
```

---

## 4. 动态规划

| 场景 | 说明 |
|------|------|
| diff 算法（LCS） | Vue/React 虚拟 DOM 比较，最长公共子序列 |
| 背包问题变体 | 活动/权限组合选择 |
| 编辑距离 | 模糊搜索匹配相似度 |

```js
// 最长公共子序列（LCS）— Virtual DOM diff 核心思想
function lcs(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}
```

---

## 5. 哈希 / Map

- **去重**：`new Set()` / `Map` 快速过滤重复数据
- **缓存/记忆化**：避免重复计算（如斐波那契、递归组件）
- **频率统计**：词云、数据聚合展示

```js
// 数组去重
const unique = arr => [...new Set(arr)];

// 记忆化缓存
function memoize(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// 频率统计
function countFrequency(arr) {
  return arr.reduce((map, item) => {
    map.set(item, (map.get(item) || 0) + 1);
    return map;
  }, new Map());
}
```

---

## 6. 贪心算法

- **区间调度**：日历/甘特图中事件不重叠排布
- **任务调度**：上传队列的并发数量控制

```js
// 区间不重叠最大数量（贪心）
function maxNonOverlapping(intervals) {
  intervals.sort((a, b) => a[1] - b[1]);
  let count = 0, end = -Infinity;
  for (const [start, finish] of intervals) {
    if (start >= end) {
      count++;
      end = finish;
    }
  }
  return count;
}
```

---

## 7. 位运算

```js
// 权限系统常见实现
const READ  = 1 << 0; // 001
const WRITE = 1 << 1; // 010
const ADMIN = 1 << 2; // 100

const userPerm = READ | WRITE;     // 赋予读写权限
const canWrite = userPerm & WRITE; // 校验写权限（非 0 即有权限）
const revoke   = userPerm & ~READ; // 撤销读权限
```

---

## 8. 防抖 / 节流

- **防抖（debounce）**：搜索框输入联想、窗口 resize 事件
- **节流（throttle）**：滚动监听、mousemove、按钮防重复点击

```js
// 防抖
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 节流
function throttle(fn, interval) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      fn.apply(this, args);
    }
  };
}
```

---

## 9. 栈与队列

- **栈（Stack）**：撤销/重做（undo/redo）、括号匹配、表达式解析
- **队列（Queue）**：任务队列、消息队列、BFS 遍历

```js
// 撤销/重做实现
class History {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
  }
  execute(state) {
    this.undoStack.push(state);
    this.redoStack = [];
  }
  undo() {
    if (!this.undoStack.length) return null;
    const state = this.undoStack.pop();
    this.redoStack.push(state);
    return this.undoStack[this.undoStack.length - 1];
  }
  redo() {
    if (!this.redoStack.length) return null;
    const state = this.redoStack.pop();
    this.undoStack.push(state);
    return state;
  }
}
```

---

## 10. 并发控制

```js
// 限制并发数的任务调度器（大文件分片上传等场景）
class Scheduler {
  constructor(limit) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }
  add(task) {
    return new Promise(resolve => {
      this.queue.push(() => task().then(resolve));
      this.run();
    });
  }
  run() {
    while (this.running < this.limit && this.queue.length) {
      const task = this.queue.shift();
      this.running++;
      task().finally(() => {
        this.running--;
        this.run();
      });
    }
  }
}
```

---

## 11. 前端高频算法场景汇总

| 场景 | 用到的算法/数据结构 |
|------|------------------|
| 虚拟列表 | 二分查找定位可视区域 |
| 图片懒加载 | 队列 + IntersectionObserver |
| 撤销/重做 | 栈（undo stack） |
| 路由匹配 | 字典树（Trie） |
| 拖拽排序 | 插入排序思想 |
| 大文件上传 | 分片 + 并发控制（信号量） |
| 虚拟 DOM diff | 最长公共子序列（LCS） |
| 菜单/权限树 | 树的遍历、平铺转树 |
| 搜索联想 | Trie 树、防抖 |
| 权限校验 | 位运算 |

---

## 总结

前端最高频的算法能力集中在：

1. **树的遍历与转换** — 菜单、权限、组件树
2. **哈希表应用** — 去重、缓存、频率统计
3. **双指针 / 滑动窗口** — 虚拟列表、区间问题
4. **递归与动态规划** — diff、路径查找
5. **排序与二分** — 数据展示、虚拟滚动
6. **栈与队列** — 撤销重做、任务调度
7. **防抖节流** — 性能优化
