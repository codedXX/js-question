/**
 * ================================================
 * 二分查找法（Binary Search / Dichotomy）
 * ================================================
 *
 * 核心思想：
 *   每次取中间值与目标值比较，将搜索范围缩小一半。
 *   就像查字典：先翻到中间，判断目标在左半边还是右半边，
 *   再继续对那半边重复操作，直到找到为止。
 *
 * 使用前提：
 *   数组必须是【有序的】（从小到大 或 从大到小）
 *
 * 时间复杂度：O(log n)  → 比普通遍历的 O(n) 快很多
 * 空间复杂度：O(1)      → 不需要额外空间
 * ================================================
 */


// ------------------------------------------------
// 方法一：迭代版（推荐新手优先掌握）
// ------------------------------------------------

/**
 * 在有序数组中查找目标值，返回其下标，找不到返回 -1
 *
 * @param {number[]} arr    - 已排好序的数组（从小到大）
 * @param {number}   target - 要查找的目标值
 * @returns {number}        - 找到返回下标，找不到返回 -1
 */
function binarySearch(arr, target) {
  // left 指针：搜索范围的左边界（从数组第一个元素开始）
  let left = 0;

  // right 指针：搜索范围的右边界（从数组最后一个元素开始）
  let right = arr.length - 1;

  // 只要左边界没有超过右边界，就继续搜索
  // 当 left > right 时，说明整个数组都找过了，目标不存在
  while (left <= right) {

    // 取中间位置的下标
    // 用 Math.floor 向下取整，避免下标出现小数
    // 例如 left=0, right=5 → mid = Math.floor((0+5)/2) = 2
    const mid = Math.floor((left + right) / 2);

    if (arr[mid] === target) {
      // 情况一：中间值正好等于目标值，直接返回下标
      return mid;

    } else if (arr[mid] < target) {
      // 情况二：中间值比目标值小
      // 说明目标在中间值的【右边】，把左边界移到 mid+1
      left = mid + 1;

    } else {
      // 情况三：中间值比目标值大
      // 说明目标在中间值的【左边】，把右边界移到 mid-1
      right = mid - 1;
    }
  }

  // 循环结束还没找到，说明数组中不存在该目标值
  return -1;
}


// ------------------------------------------------
// 方法二：递归版（帮助理解递归思想）
// ------------------------------------------------

/**
 * 递归实现二分查找
 * 递归 = 函数自己调用自己，每次缩小搜索范围
 *
 * @param {number[]} arr    - 已排好序的数组
 * @param {number}   target - 要查找的目标值
 * @param {number}   left   - 当前搜索范围的左边界（默认 0）
 * @param {number}   right  - 当前搜索范围的右边界（默认 arr.length-1）
 * @returns {number}        - 找到返回下标，找不到返回 -1
 */
function binarySearchRecursive(arr, target, left = 0, right = arr.length - 1) {
  // 递归终止条件：左边界超过右边界，说明找不到了
  if (left > right) return -1;

  // 计算中间下标
  const mid = Math.floor((left + right) / 2);

  if (arr[mid] === target) {
    // 找到了，返回下标
    return mid;

  } else if (arr[mid] < target) {
    // 目标在右边，递归搜索右半部分
    // 注意：left 变为 mid+1，right 不变
    return binarySearchRecursive(arr, target, mid + 1, right);

  } else {
    // 目标在左边，递归搜索左半部分
    // 注意：left 不变，right 变为 mid-1
    return binarySearchRecursive(arr, target, left, mid - 1);
  }
}


// ------------------------------------------------
// 方法三：查找第一个等于目标值的位置
// （数组中有重复值时，找最左边那个）
// ------------------------------------------------

/**
 * 在含重复元素的有序数组中，找到目标值第一次出现的下标
 *
 * @param {number[]} arr    - 有序数组（可含重复元素）
 * @param {number}   target - 要查找的目标值
 * @returns {number}        - 第一次出现的下标，找不到返回 -1
 */
function binarySearchFirst(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  let result = -1; // 用来记录最近一次找到的下标

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    if (arr[mid] === target) {
      result = mid;       // 先记录这次找到的位置
      right = mid - 1;    // 继续往左边找，看有没有更早出现的
    } else if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return result;
}


// ------------------------------------------------
// 测试 & 演示
// ------------------------------------------------

console.log('========== 二分查找测试 ==========\n');

// 准备一个从小到大排好序的数组
const sortedArray = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
console.log('测试数组：', sortedArray);
console.log('数组长度：', sortedArray.length, '\n');

// --- 测试方法一：迭代版 ---
console.log('--- 迭代版 binarySearch ---');
console.log('查找 23，期望下标 5，实际：', binarySearch(sortedArray, 23));   // 5
console.log('查找 2， 期望下标 0，实际：', binarySearch(sortedArray, 2));    // 0
console.log('查找 91，期望下标 9，实际：', binarySearch(sortedArray, 91));   // 9
console.log('查找 99，期望    -1，实际：', binarySearch(sortedArray, 99));   // -1
console.log('查找 1， 期望    -1，实际：', binarySearch(sortedArray, 1));    // -1
console.log();

// --- 测试方法二：递归版 ---
console.log('--- 递归版 binarySearchRecursive ---');
console.log('查找 56，期望下标 7，实际：', binarySearchRecursive(sortedArray, 56)); // 7
console.log('查找 8， 期望下标 2，实际：', binarySearchRecursive(sortedArray, 8));  // 2
console.log('查找 100，期望   -1，实际：', binarySearchRecursive(sortedArray, 100)); // -1
console.log();

// --- 测试方法三：查找第一个出现位置 ---
const arrayWithDups = [1, 3, 3, 3, 5, 7, 9];
console.log('--- 含重复元素 binarySearchFirst ---');
console.log('测试数组：', arrayWithDups);
console.log('查找 3 第一次出现，期望下标 1，实际：', binarySearchFirst(arrayWithDups, 3)); // 1
console.log('查找 5 第一次出现，期望下标 4，实际：', binarySearchFirst(arrayWithDups, 5)); // 4
console.log('查找 6 第一次出现，期望    -1，实际：', binarySearchFirst(arrayWithDups, 6)); // -1
console.log();

// ------------------------------------------------
// 图解：查找 23 的过程
// ------------------------------------------------
//
//  数组：[2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
//  下标：  0  1  2   3   4   5   6   7   8   9
//
//  第1轮：left=0, right=9 → mid=4 → arr[4]=16 < 23 → 目标在右边，left=5
//  第2轮：left=5, right=9 → mid=7 → arr[7]=56 > 23 → 目标在左边，right=6
//  第3轮：left=5, right=6 → mid=5 → arr[5]=23 = 23 → 找到了！返回 5
//
//  只用了 3 次比较，而普通遍历需要比较 6 次
// ------------------------------------------------
