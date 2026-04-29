/**
 * 问题：为什么有个while (left <= right) {} ？
 * 1.<= 而不是 <，是为了处理搜索范围缩小到只剩一个元素的情况。
 * 当 left === right 时，说明范围内还剩最后一个元素，这个元素还没被检查过，必须进去比一次
 */
// 二分查找：在有序数组中查找目标值，返回下标，找不到返回 -1
function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      left = mid + 1;  // 目标在右边，左边界右移
    } else {
      right = mid - 1; // 目标在左边，右边界左移
    }
  }

  return -1;
}


// ============================================
// 例子：模拟"查成绩单"
// 学校把所有学生的分数从低到高排列，给你一个分数，
// 快速找出它排在第几位（下标+1），以及前后的分数是多少。
// ============================================

const scores = [42, 55, 61, 67, 73, 78, 82, 85, 88, 91, 95];
//   下标：       0   1   2   3   4   5   6   7   8   9  10

function queryScore(scores, target) {
  console.log(`\n查找分数：${target}`);

  const index = binarySearch(scores, target);

  if (index === -1) {
    console.log(`  ${target} 不在成绩单中`);
    return;
  }

  console.log(`  找到了，排名第 ${index + 1} 位（下标 ${index}）`);
  console.log(`  比它低的分数：${index > 0 ? scores[index - 1] : "无"}`);
  console.log(`  比它高的分数：${index < scores.length - 1 ? scores[index + 1] : "无"}`);
}

console.log("成绩单（从低到高）：", scores);

queryScore(scores, 78); // 中间位置
queryScore(scores, 42); // 最低分
queryScore(scores, 95); // 最高分
queryScore(scores, 70); // 不存在的分数


// ============================================
// 查找 78 的详细过程（图解）：
//
//  数组：[42, 55, 61, 67, 73, 78, 82, 85, 88, 91, 95]
//  下标：  0   1   2   3   4   5   6   7   8   9  10
//
//  第1轮：left=0, right=10 → mid=5 → arr[5]=78 === 78 → 直接找到！返回 5
//
// 查找 95 的过程：
//  第1轮：left=0, right=10 → mid=5  → arr[5]=78  < 95 → 目标在右边，left=6
//  第2轮：left=6, right=10 → mid=8  → arr[8]=88  < 95 → 目标在右边，left=9
//  第3轮：left=9, right=10 → mid=9  → arr[9]=91  < 95 → 目标在右边，left=10
//  第4轮：left=10,right=10 → mid=10 → arr[10]=95 === 95 → 找到！返回 10
//
// 查找 70 的过程：
//  第1轮：left=0, right=10 → mid=5 → arr[5]=78  > 70 → 目标在左边，right=4
//  第2轮：left=0, right=4  → mid=2 → arr[2]=61  < 70 → 目标在右边，left=3
//  第3轮：left=3, right=4  → mid=3 → arr[3]=67  < 70 → 目标在右边，left=4
//  第4轮：left=4, right=4  → mid=4 → arr[4]=73  > 70 → 目标在左边，right=3
//  left(4) > right(3)，退出循环，返回 -1（不存在）
// ============================================
