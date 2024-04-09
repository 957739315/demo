/**
 * 并发请求池控制
 * 支持多个异步任务同时执行，等待全部执行完成后，直接返回执行结果
 * - 支持限制并发池的大小
 * - 支持全部任务执行成功后，进行回调处理
 * - 支持执行过程中继续追加任务
 * - 返回结果支持按顺序返回
 */
class TaskQueue {
  maxNum: number;
  running: number;
  queue: Array<any>;
  queueIndex: number;
  results: object;
  callback: null | Function;

  constructor(maxNum) {
    this.maxNum = maxNum; // 并发池数量大小
    this.running = 0; // 当前正在执行的池数
    this.queue = []; // 任务队列
    this.queueIndex = 0; // 当前任务索引顺序
    this.results = {}; // 存储任务执行结果
    this.callback = null; // 回调函数
  }
  pushTask(task) {
    this.queue.push(task);
    this.next();
  }
  next() {
    while (this.running < this.maxNum && this.queue.length) {
      const task = this.queue.shift();
      const key = task.key || this.queueIndex;
      this.queueIndex++;
      task
        .fn()
        .then((res) => {
          this.results[key] = res;
        })
        .catch((err) => {
          this.results[key] = err;
        })
        .finally(() => {
          this.running--;
          this.next();
        });
      this.running++;
    }

    if (typeof this.callback === "function" && this.running == 0) {
      this.callback.call(null, this.results);
    }
  }
}

export function asyncPool_1(tasks, max, callback) {
  const queue = new TaskQueue(max);
  queue.callback = callback;
  tasks.forEach((task) => queue.pushTask(task));
  return queue;
}

// 测试
function buildTask(result, delay = 0) {
  return () =>
    new Promise((resolve) =>
      setTimeout(() => {
        console.log("正在执行任务", result);
        resolve(result);
      }, delay)
    );
}
const tasks = [
  { fn: buildTask(1, 100) },
  { fn: buildTask(2, 200) },
  { fn: buildTask(3, 300) },
  { fn: buildTask(4, 100), key: "four" },
];

function run() {
  asyncPool_1(tasks, 2, (result) => {
    console.log("🚀 ~ asyncPool_1 ~ result:", result);
  });
}
run();
