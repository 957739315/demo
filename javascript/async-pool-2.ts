/**
 * 并发请求池控制
 * 支持多个异步任务同时执行，等待全部执行完成后，直接返回执行结果
 * - 支持限制并发池的大小
 * - 支持全部任务执行成功后，进行回调处理
 * - 支持对执行结果按顺序取用 或 按需取用
 */
interface ITask {
  fn: () => Promise<any>;
  key?: string | number;
}

interface IResults {
  [key: string | number]: any;
}
function asyncPool_2(tasks: Array<ITask>, max: number, callback: Function) {
  let result: IResults = {};
  let taskIndex = 0;
  Promise.all(
    Array.from({ length: max }).map(() => {
      return new Promise((resolve) => {
        function runTask() {
          if (tasks.length <= 0) {
            resolve(null);
            return;
          }
          const task = tasks.shift();
          const key = task?.key || taskIndex;
          if (!task?.fn) {
            result[key] = null;
            taskIndex++;
            runTask();
            return;
          }
          task.fn().then((res) => {
            result[key] = res;
            runTask();
          });
          taskIndex++;
        }
        runTask();
      });
    })
  ).then(() => callback(result));
}

/**
 * 测试用例
 */
function run() {
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
  asyncPool_2(tasks, 5, (result: any) => {
    console.log("asyncPool_2 ~ result:", result);
    console.log(result[1]); // 支持按顺序取用结果
    console.log(result.four); // 支持针对特殊任务取用结果
  });
}

run();
