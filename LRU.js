/**
 * LRU (Least Recently Used) 最近期最少使用算法
 * 
 * 背景知识：
 * 在 Vue3 中，<KeepAlive> 组件在缓存组件实例时，如果超出了设置的 max (最大缓存数量)，
 * 就会使用 LRU 算法来决定淘汰掉哪个组件。
 * 
 * 核心思想：
 * 1. 缓存有个最大容量 (capacity)。
 * 2. 每次访问 (读取/写入) 一个缓存时，这个缓存就被标记为“最新使用”，应该放到队伍的最后面。
 * 3. 当缓存满了，需要加入新东西时，必须把队伍最前面那个“最久没被使用”的淘汰掉。
 * 
 * 在 JavaScript 中，实现 LRU 最巧妙的办法是利用 `Map`。
 * 因为 ES6 的 Map 在迭代时，是【按照元素的插入顺序】进行的。
 * 新插入的元素总是在最后面。这就天然符合 LRU 排队的思想！
 */
class LRUCache {
  /**
   * 初始化缓存
   * @param {number} capacity - 缓存的最大容量
   */
  constructor(capacity) {
    this.capacity = capacity;
    // Map 是有顺序的，先放入的在前面，后放入的在最后面
    this.cache = new Map();
  }

  /**
   * 获取缓存 (相当于 Vue3 KeepAlive 中命中缓存)
   * @param {any} key - 缓存的键名
   * @returns {any} 返回缓存的值，如果没有返回 -1或者undefined
   */
  get(key) {
    // 1. 如果根本没有这个缓存，直接返回没找到（这里返回 -1，也可以抛出 undefined）
    if (!this.cache.has(key)) {
      return -1;
    }

    // 2. 如果找到了这个缓存，说明它“刚刚被使用过了”
    // 所以我们需要获取它的值，然后把它从当前位置删掉，再重新存入一次！
    // 这样它就跑到 Map 的最后面了（代表最新活跃的，最不容易被淘汰）。
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  /**
   * 写入存入缓存 (相当于 Vue3 KeepAlive 中缓存一个新组件)
   * @param {any} key - 缓存的键名 
   * @param {any} value - 缓存的值
   */
  put(key, value) {
    // 1. 既然要存入新值，那这个数据就是最新活跃的。
    // 如果它之前已经存在了，我们要先把它从老位置删掉。
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 2. 将最新的数据存入 Map。它会自动排在队伍的最后面。
    this.cache.set(key, value);

    // 3. 检查容量是不是超标了！
    if (this.cache.size > this.capacity) {
      // 如果超标，我们需要淘汰掉最久没被使用的数据（也就是队伍最前面的那一个）。
      // cache.keys() 会返回一个迭代器。
      // 它调用 .next() 拿到的第一个值，就是 Map 里最老、最前面插入的那个 key！
      const oldestKey = this.cache.keys().next().value;

      // 狠心将其淘汰：相当于 Vue3 中销毁那个最久都没有打开过的组件
      this.cache.delete(oldestKey);
    }
  }
}

// ============== 下面是测试代码，你可以直接运行这个文件查看结果 ==============

// 假设我们创建一个容量为 2 的 LRU 缓存（像 KeepAlive: max="2"）
const cache = new LRUCache(2);

console.log("放入 A 和 B");
cache.put("A", 1);
cache.put("B", 2);
// 现在的顺序 (前面老，后面新): [A, B]

console.log("读取 A", cache.get("A"));
// A 被访问了，A 变成了最新的，跑到后面去。现在的顺序: [B, A]

console.log("放入新数据 C");
cache.put("C", 3);
// 缓存满了(容量2)！要淘汰最老的。谁在最前面？是 B！所以 B 被踢出去了。
// 现在的顺序: [A, C]

console.log("读取已经被淘汰掉的 B 会怎么样？", cache.get("B"));
// 返回 -1，因为它已经被挤出缓存了。

console.log("读取没被淘汰的 A", cache.get("A"));
// 返回 1，而且 A 再次变成最新。现在的顺序: [C, A]
