/**
 * Object.defineProperty 的基本使用 Demo
 * 
 * 这个 Demo 展示了 Vue2 响应式原理的核心，
 * 以及它为什么无法拦截对象新增属性（需要 $set 的原因）。
 */

const user = { 
  name: '张三', 
  age: 18 
}

// ⚠️ 注意：这是一个新手常踩的坑！
// 我们必须用一个额外的变量来"中转"数据。
// 如果在 get/set 里面直接写 return user.name 或者 user.name = newValue，会导致无限死循环！
let internalName = user.name;

// 使用 Object.defineProperty 专门劫持 user 对象的 'name' 属性
Object.defineProperty(user, 'name', {
  // 当有人读取 user.name 时，触发 get 函数
  get() {
    console.log(`[GET] 发现有人读取 name 属性，当前值是: ${internalName}`);
    return internalName;
  },
  
  // 当有人修改 user.name 时，触发 set 函数
  set(newValue) {
    console.log(`[SET] 发现有人修改 name 属性，准备改为: ${newValue}`);
    internalName = newValue; // 把新值存到中转变量里
  }
});

console.log('--- 测试开始 ---');

// 测试1：读取已存在的、被劫持的属性
console.log('读取 name:', user.name); 
// 控制台会打印：[GET] 发现有人读取 name 属性... 以及 "张三"

// 测试2：修改已存在的、被劫持的属性
user.name = '李四'; 
// 控制台会打印：[SET] 发现有人修改 name 属性...

// 测试3：新增一个属性（核心区别所在！！！）
user.email = 'test@example.com'; 
console.log('读取新增的 email:', user.email); 
// 控制台只会打印 "test@example.com"，【没有任何拦截日志】！
// 因为 defineProperty 刚才只对 'name' 进行了设置，它根本不知道 'email' 的存在。