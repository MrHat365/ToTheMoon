import * as schedule from 'node-schedule';

// 定时任务配置接口
export interface SchedulerConfig {
  taskId: string;  // 任务唯一标识
  minTimeSeconds: number;  // 最小时间间隔（秒）
  maxTimeSeconds: number;  // 最大时间间隔（秒）
  taskFunction: () => void;  // 要执行的函数
}

// 定时任务状态
export interface TaskStatus {
  taskId: string;
  isRunning: boolean;
  startTime?: Date;
  lastExecutionTime?: Date;
  nextExecutionTime?: Date;
  executionCount: number;
}

/**
 * 通用定时任务管理器
 * 支持随机时间间隔的定时任务调度
 */
export class SchedulerService {
  private tasks: Map<string, {
    job: schedule.Job | null;
    config: SchedulerConfig;
    status: TaskStatus;
    timeoutId: NodeJS.Timeout | null;
  }> = new Map();

  /**
   * 启动定时任务
   * @param config 任务配置
   */
  startTask(config: SchedulerConfig): boolean {
    try {
      // 如果任务已存在，先停止并等待清理完成
      if (this.tasks.has(config.taskId)) {
        console.log(`发现已存在的任务 ${config.taskId}，正在停止...`);
        this.stopTask(config.taskId);
        // 短暂等待确保清理完成
        setTimeout(() => {}, 100);
      }

      // 创建任务状态
      const status: TaskStatus = {
        taskId: config.taskId,
        isRunning: true,
        startTime: new Date(),
        executionCount: 0
      };

      // 存储任务信息
      this.tasks.set(config.taskId, {
        job: null,
        config,
        status,
        timeoutId: null
      });

      // 立即开始第一次调度
      this.scheduleNextExecution(config.taskId);

      console.log(`定时任务已启动: ${config.taskId}, 时间范围: ${config.minTimeSeconds}-${config.maxTimeSeconds}秒`);
      return true;
    } catch (error) {
      console.error(`启动定时任务失败 [${config.taskId}]:`, error);
      return false;
    }
  }

  /**
   * 停止定时任务
   * @param taskId 任务ID
   */
  stopTask(taskId: string): boolean {
    try {
      console.log(`[stopTask] 正在尝试停止任务: ${taskId}`);
      console.log(`[stopTask] 当前任务列表:`, Array.from(this.tasks.keys()));
      
      const task = this.tasks.get(taskId);
      if (!task) {
        console.warn(`尝试停止不存在的任务: ${taskId}`);
        console.log(`[stopTask] 可用任务ID:`, Array.from(this.tasks.keys()));
        return false;
      }

      console.log(`正在停止定时任务: ${taskId}`);

      // 先标记任务为停止状态，防止新的调度
      task.status.isRunning = false;
      task.status.nextExecutionTime = undefined;

      // 停止当前的job
      if (task.job) {
        try {
          task.job.cancel();
          console.log(`[${taskId}] node-schedule job已取消`);
        } catch (jobError) {
          console.warn(`[${taskId}] 取消node-schedule job失败:`, jobError);
        }
      }

      // 清除timeout
      if (task.timeoutId) {
        try {
          clearTimeout(task.timeoutId);
          console.log(`[${taskId}] setTimeout已清除`);
        } catch (timeoutError) {
          console.warn(`[${taskId}] 清除setTimeout失败:`, timeoutError);
        }
        task.timeoutId = null;
      }

      // 从任务列表中移除
      this.tasks.delete(taskId);

      console.log(`定时任务已完全停止: ${taskId}`);
      return true;
    } catch (error) {
      console.error(`停止定时任务失败 [${taskId}]:`, error);
      // 即使出错也尝试从任务列表中移除
      try {
        this.tasks.delete(taskId);
      } catch (deleteError) {
        console.error(`强制删除任务失败 [${taskId}]:`, deleteError);
      }
      return false;
    }
  }

  /**
   * 获取任务状态
   * @param taskId 任务ID
   */
  getTaskStatus(taskId: string): TaskStatus | null {
    const task = this.tasks.get(taskId);
    return task ? { ...task.status } : null;
  }

  /**
   * 获取所有任务状态
   */
  getAllTasksStatus(): TaskStatus[] {
    return Array.from(this.tasks.values()).map(task => ({ ...task.status }));
  }

  /**
   * 检查任务是否正在运行
   * @param taskId 任务ID
   */
  isTaskRunning(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    return task ? task.status.isRunning : false;
  }

  /**
   * 获取所有任务的详细信息（调试用）
   */
  getAllTasks(): Map<string, any> {
    return new Map(this.tasks);
  }

  /**
   * 停止所有任务
   */
  stopAllTasks(): void {
    const taskIds = Array.from(this.tasks.keys());
    console.log(`正在停止所有任务，共 ${taskIds.length} 个任务`);
    taskIds.forEach(taskId => this.stopTask(taskId));
    console.log('所有定时任务已停止');
  }

  /**
   * 强制清理所有任务（紧急情况使用）
   */
  forceCleanAllTasks(): void {
    console.log('强制清理所有任务...');
    
    // 清理所有timeout
    this.tasks.forEach((task, taskId) => {
      try {
        if (task.timeoutId) {
          clearTimeout(task.timeoutId);
        }
        if (task.job) {
          task.job.cancel();
        }
        console.log(`强制清理任务: ${taskId}`);
      } catch (error) {
        console.error(`强制清理任务失败 [${taskId}]:`, error);
      }
    });

    // 清空任务列表
    this.tasks.clear();
    console.log('所有任务已强制清理完成');
  }

  /**
   * 检查并清理异常任务
   */
  cleanupStaleError(): void {
    const staleTaskIds: string[] = [];
    const now = Date.now();
    
    this.tasks.forEach((task, taskId) => {
      // 检查任务是否长时间没有执行
      if (task.status.lastExecutionTime) {
        const timeSinceLastExecution = now - task.status.lastExecutionTime.getTime();
        // 如果超过5分钟没有执行，认为是异常任务
        if (timeSinceLastExecution > 5 * 60 * 1000) {
          staleTaskIds.push(taskId);
        }
      } else if (task.status.startTime) {
        const timeSinceStart = now - task.status.startTime.getTime();
        // 如果启动超过2分钟但从未执行，认为是异常任务
        if (timeSinceStart > 2 * 60 * 1000) {
          staleTaskIds.push(taskId);
        }
      }
    });

    if (staleTaskIds.length > 0) {
      console.log(`发现 ${staleTaskIds.length} 个异常任务，正在清理...`);
      staleTaskIds.forEach(taskId => {
        console.log(`清理异常任务: ${taskId}`);
        this.stopTask(taskId);
      });
    }
  }

  /**
   * 生成随机时间间隔（秒）
   * @param minSeconds 最小秒数
   * @param maxSeconds 最大秒数
   */
  private generateRandomInterval(minSeconds: number, maxSeconds: number): number {
    return Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
  }

  /**
   * 调度下一次执行
   * @param taskId 任务ID
   */
  private scheduleNextExecution(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task || !task.status.isRunning) {
      console.log(`[${taskId}] 任务已停止或不存在，取消调度`);
      return;
    }

    const { config, status } = task;
    
    // 生成随机时间间隔
    const intervalSeconds = this.generateRandomInterval(
      config.minTimeSeconds,
      config.maxTimeSeconds
    );

    // 计算下次执行时间
    const nextTime = new Date(Date.now() + intervalSeconds * 1000);
    status.nextExecutionTime = nextTime;

    console.log(`[${taskId}] 下次执行时间: ${nextTime.toLocaleString('zh-CN')}, 间隔: ${intervalSeconds}秒`);

    // 使用setTimeout进行调度
    task.timeoutId = setTimeout(() => {
      // 再次检查任务是否还存在且正在运行
      const currentTask = this.tasks.get(taskId);
      if (!currentTask || !currentTask.status.isRunning) {
        console.log(`[${taskId}] 任务在执行前已被停止，跳过执行`);
        return;
      }

      try {
        // 执行任务函数
        config.taskFunction();
        
        // 更新执行状态
        status.lastExecutionTime = new Date();
        status.executionCount++;

        console.log(`[${taskId}] 任务执行完成，执行次数: ${status.executionCount}`);

        // 调度下一次执行 - 再次检查任务状态
        const taskForNext = this.tasks.get(taskId);
        if (taskForNext && taskForNext.status.isRunning) {
          this.scheduleNextExecution(taskId);
        } else {
          console.log(`[${taskId}] 任务在调度下次执行时已被停止`);
        }
      } catch (error) {
        console.error(`[${taskId}] 任务执行出错:`, error);
        // 即使出错也检查是否需要继续调度
        const taskForRetry = this.tasks.get(taskId);
        if (taskForRetry && taskForRetry.status.isRunning) {
          this.scheduleNextExecution(taskId);
        } else {
          console.log(`[${taskId}] 任务在重试调度时已被停止`);
        }
      }
    }, intervalSeconds * 1000);
  }

  /**
   * 获取任务调试信息
   */
  getDebugInfo(): Record<string, any> {
    const info: Record<string, any> = {};
    
    this.tasks.forEach((task, taskId) => {
      info[taskId] = {
        config: {
          minTimeSeconds: task.config.minTimeSeconds,
          maxTimeSeconds: task.config.maxTimeSeconds
        },
        status: task.status,
        hasJob: !!task.job,
        hasTimeout: !!task.timeoutId
      };
    });

    return info;
  }
}

// 导出单例实例
export const schedulerService = new SchedulerService();

// 进程退出时清理所有任务
process.on('SIGTERM', () => {
  console.log('接收到SIGTERM信号，正在清理定时任务...');
  schedulerService.stopAllTasks();
});

process.on('SIGINT', () => {
  console.log('接收到SIGINT信号，正在清理定时任务...');
  schedulerService.stopAllTasks();
});
