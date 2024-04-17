/**
 * 并发请求池控制
 * 支持多个异步任务同时执行，等待全部执行完成后，直接返回执行结果
 * - 支持限制并发池的大小
 * - 支持全部任务执行成功后，进行回调处理
 * - 支持对执行结果按顺序取用 或 按需取用
 * = 支持执行过程中继续追加任务
 */
interface ITask {
  fn: () => Promise<any>;
  key?: string | number;
}

interface IResults {
  [key: string | number]: any;
}
class TaskQueue {
  maxNum: number;
  running: number;
  queue: Array<ITask>;
  queueIndex: number;
  results: IResults;
  callback: null | Function;
  isPushOver: boolean;

  constructor(maxNum: number) {
    this.maxNum = maxNum; // 并发池数量大小
    this.running = 0; // 当前正在执行的池数
    this.queue = []; // 任务队列
    this.queueIndex = 0; // 当前进入执行的任务索引顺序
    this.results = {}; // 存储任务执行结果
    this.callback = null; // 回调函数
    this.isPushOver = false; // 任务是否追加完毕
  }

  // 追加任务，并执行
  pushTasks(tasks: Array<ITask>) {
    this.queue.push(...tasks);
    this.next();
  }

  // 通知任务追加完毕
  pushOver() {
    this.isPushOver = true;
    this.runOver();
  }

  // 任务全部执行完毕
  runOver() {
    if (
      typeof this.callback === "function" &&
      this.running == 0 &&
      this.isPushOver
    ) {
      this.callback.call(null, this.results);
    }
  }

  next() {
    while (this.running < this.maxNum && this.queue.length) {
      const task = this.queue.shift();
      // 标识当前任务索引，方便从 results 取用值
      const key = task?.key || this.queueIndex;
      this.queueIndex++;
      // 任务池被占用数量+1
      this.running++;
      // 任务临界判断合法性
      if (!task) {
        this.results[key] = null;
        this.running--;
        continue;
      }
      // 执行任务
      task
        .fn()
        .then((res: any) => {
          this.results[key] = res;
        })
        .catch((err: any) => {
          this.results[key] = err;
        })
        .finally(() => {
          this.running--;
          this.next();
        });
    }

    this.runOver();
  }
}

/**
 * 测试用例
 */

function run() {
  // 创建实例
  const queue = new TaskQueue(5);
  queue.callback = (result: any) => {
    console.log("asyncPool_1 ~ result:", result);
    console.log(result[1]); // 支持按顺序取用结果
    console.log(result.four); // 支持针对特殊任务取用结果
  };

  function buildTask(result: any, delay = 0) {
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
    { fn: buildTask(4, 100), key: "four" }, // key
  ];
  queue.pushTasks(tasks);
  setTimeout(() => {
    console.log("再追加一个任务");
    queue.pushTasks([{ fn: buildTask(5, 100), key: 5 }]);
  }, 500);

  setTimeout(() => {
    console.log("通知追加结束");
    queue.pushOver();
  }, 700);
}

run();
