/**
 * Vue 3 Diff 算法 Demo（简化版，便于理解）
 *
 * 真实的 Vue 3 diff 操作的是虚拟 DOM（VNode）
 * 这里用简单的对象模拟 VNode，用 console.log 代替真实 DOM 操作
 * 这样你可以直接在 Node.js 里运行，看清楚每一步发生了什么
 */

// ─────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────

// 判断两个节点是否"可以复用"（type 和 key 都相同）
function isSameVNode(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key
}

// 模拟"更新节点"（真实场景是递归 patch，这里只打印）
function patch(n1, n2) {
  console.log(`  ✏️  更新节点: [${n1.key}] "${n1.text}" → "${n2.text}"`)
}

// 模拟"挂载新节点"
function mount(node, anchor) {
  const info = anchor ? `（插入到 ${anchor.key} 前面）` : ''
  console.log(`  ➕ 挂载节点: [${node.key}] "${node.text}" ${info}`)
}

// 模拟"卸载旧节点"
function unmount(node) {
  console.log(`  ❌ 卸载节点: [${node.key}] "${node.text}"`)
}

// 模拟"移动节点"
function move(node, anchor) {
  const info = anchor ? `移到 [${anchor.key}] 前面` : '移到末尾'
  console.log(`  🔀 移动节点: [${node.key}] "${node.text}"，${info}`)
}

// ─────────────────────────────────────────────
// 最长递增子序列（LIS）算法
// 作用：找出"不需要移动"的节点索引集合，最小化 DOM 移动次数
// ─────────────────────────────────────────────
function getSequence(arr) {
  // 这是 Vue 3 源码里的 LIS 实现，用了"耐心排序 + 回溯"
  const p = arr.slice()          // 记录前驱节点索引，用于回溯
  const result = [0]             // 存放 LIS 的索引（贪心选最小尾部）
  let i, j, u, v, c

  for (i = 0; i < arr.length; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {            // 0 表示新节点，跳过
      j = result[result.length - 1]
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }
      // 二分查找：找到第一个 >= arrI 的位置
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) u = c + 1
        else v = c
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) p[i] = result[u - 1]
        result[u] = i
      }
    }
  }

  // 回溯，得到真实的 LIS 索引序列
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}

// ─────────────────────────────────────────────
// 核心 Diff 函数：patchKeyedChildren
// 参数：旧子节点数组 c1，新子节点数组 c2
// ─────────────────────────────────────────────
function patchKeyedChildren(c1, c2) {
  let i = 0
  let e1 = c1.length - 1  // 旧节点末尾指针
  let e2 = c2.length - 1  // 新节点末尾指针

  console.log('\n【第一步】头部预处理：从左往右找第一个不同的节点')
  while (i <= e1 && i <= e2) {
    if (isSameVNode(c1[i], c2[i])) {
      patch(c1[i], c2[i])
      i++
    } else {
      break
    }
  }
  console.log(`  → 头部处理完，i=${i}`)

  console.log('\n【第二步】尾部预处理：从右往左找第一个不同的节点')
  while (i <= e1 && i <= e2) {
    if (isSameVNode(c1[e1], c2[e2])) {
      patch(c1[e1], c2[e2])
      e1--
      e2--
    } else {
      break
    }
  }
  console.log(`  → 尾部处理完，e1=${e1}, e2=${e2}`)

  console.log('\n【第三步】旧节点遍历完，新节点还有剩余 → 全部挂载')
  if (i > e1 && i <= e2) {
    while (i <= e2) {
      mount(c2[i])
      i++
    }
    return
  }

  console.log('\n【第四步】新节点遍历完，旧节点还有剩余 → 全部卸载')
  if (i > e2 && i <= e1) {
    while (i <= e1) {
      unmount(c1[i])
      i++
    }
    return
  }

  console.log('\n【第五步】中间乱序部分，用 key 映射 + LIS 最小化移动')

  const s1 = i  // 旧节点乱序起始
  const s2 = i  // 新节点乱序起始

  // 5.1 建立新节点的 key → index 映射表（O(1) 查找）
  const keyToNewIndexMap = new Map()
  for (let j = s2; j <= e2; j++) {
    keyToNewIndexMap.set(c2[j].key, j)
  }
  console.log('  建立 key→index 映射表:', Object.fromEntries(keyToNewIndexMap))

  // 5.2 遍历旧节点，找能复用的 patch，找不到的卸载
  // newIndexToOldIndexMap: 新节点位置 → 在旧节点中的位置（+1，0表示全新节点）
  const toBePatched = e2 - s2 + 1
  const newIndexToOldIndexMap = new Array(toBePatched).fill(0)

  console.log('\n  遍历旧节点，找复用/需卸载的节点:')
  for (let j = s1; j <= e1; j++) {
    const oldNode = c1[j]
    const newIndex = keyToNewIndexMap.get(oldNode.key)
    if (newIndex === undefined) {
      unmount(oldNode)
    } else {
      newIndexToOldIndexMap[newIndex - s2] = j + 1  // +1 避免和"0=全新节点"混淆
      patch(oldNode, c2[newIndex])
    }
  }

  console.log('\n  新→旧位置映射表 newIndexToOldIndexMap:', newIndexToOldIndexMap)
  console.log('  （0 表示全新节点，需要挂载）')

  // 5.3 求 LIS，确定哪些节点不需要移动
  const sequence = getSequence(newIndexToOldIndexMap)
  console.log('\n  最长递增子序列 LIS（这些节点不需要移动）:', sequence)

  // 5.4 从后往前遍历，移动或挂载节点
  console.log('\n  从后往前处理每个新节点:')
  let sequenceIndex = sequence.length - 1
  for (let k = toBePatched - 1; k >= 0; k--) {
    const newPos = s2 + k
    const newNode = c2[newPos]
    const anchor = newPos + 1 <= e2 ? c2[newPos + 1] : null  // 锚点（插入位置）

    if (newIndexToOldIndexMap[k] === 0) {
      mount(newNode, anchor)
    } else if (k === sequence[sequenceIndex]) {
      console.log(`  ✅ 节点 [${newNode.key}] 在 LIS 中，不需要移动`)
      sequenceIndex--
    } else {
      move(newNode, anchor)
    }
  }
}

// ─────────────────────────────────────────────
// 开始跑 Demo！
// ─────────────────────────────────────────────

console.log('═'.repeat(60))
console.log('Demo 1：只有新增节点（旧节点是新节点的前缀）')
console.log('═'.repeat(60))
console.log('旧: [A, B]')
console.log('新: [A, B, C, D]')
patchKeyedChildren(
  [{ key: 'A', type: 'div', text: 'A' }, { key: 'B', type: 'div', text: 'B' }],
  [{ key: 'A', type: 'div', text: 'A' }, { key: 'B', type: 'div', text: 'B' },
   { key: 'C', type: 'div', text: 'C' }, { key: 'D', type: 'div', text: 'D' }]
)

console.log('\n' + '═'.repeat(60))
console.log('Demo 2：只有删除节点（新节点是旧节点的前缀）')
console.log('═'.repeat(60))
console.log('旧: [A, B, C, D]')
console.log('新: [A, B]')
patchKeyedChildren(
  [{ key: 'A', type: 'div', text: 'A' }, { key: 'B', type: 'div', text: 'B' },
   { key: 'C', type: 'div', text: 'C' }, { key: 'D', type: 'div', text: 'D' }],
  [{ key: 'A', type: 'div', text: 'A' }, { key: 'B', type: 'div', text: 'B' }]
)

console.log('\n' + '═'.repeat(60))
console.log('Demo 3：乱序 + 新增 + 删除（最复杂的情况）')
console.log('═'.repeat(60))
console.log('旧: [A, B, C, D, E, F]')
console.log('新: [A, C, E, D, G, F]')
console.log('变化：B 被删除，C/E/D 乱序，G 是新增节点')
patchKeyedChildren(
  [
    { key: 'A', type: 'div', text: 'A老' },
    { key: 'B', type: 'div', text: 'B老' },
    { key: 'C', type: 'div', text: 'C老' },
    { key: 'D', type: 'div', text: 'D老' },
    { key: 'E', type: 'div', text: 'E老' },
    { key: 'F', type: 'div', text: 'F老' },
  ],
  [
    { key: 'A', type: 'div', text: 'A新' },
    { key: 'C', type: 'div', text: 'C新' },
    { key: 'E', type: 'div', text: 'E新' },
    { key: 'D', type: 'div', text: 'D新' },
    { key: 'G', type: 'div', text: 'G新' },
    { key: 'F', type: 'div', text: 'F新' },
  ]
)
