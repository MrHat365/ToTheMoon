import { Filter, UpdateFilter } from 'mongodb'
import { BaseRepository } from './base-repository'
import {
  COLLECTIONS,
  Template,
  TimedTaskConfig,
  TimedTaskHistory,
  OrderExecution,
  SystemLog,
  ExchangeType
} from './schemas'

/**
 * 模板Repository
 */
export class TemplateRepository extends BaseRepository<Template> {
  constructor() {
    super(COLLECTIONS.TEMPLATES)
  }

  /**
   * 根据状态查找模板
   */
  public async findByStatus(status: 'enabled' | 'disabled'): Promise<Template[]> {
    return await this.find({ status } as Filter<Template>)
  }

  /**
   * 根据运行状态查找模板
   */
  public async findByRunningStatus(runningStatus: 'running' | 'stopped'): Promise<Template[]> {
    return await this.find({ runningStatus } as Filter<Template>)
  }

  /**
   * 获取正在运行的启用模板
   */
  public async findActiveRunningTemplates(): Promise<Template[]> {
    return await this.find({
      status: 'enabled',
      runningStatus: 'running'
    } as Filter<Template>)
  }

  /**
   * 更新运行状态
   */
  public async updateRunningStatus(id: string, runningStatus: 'running' | 'stopped'): Promise<boolean> {
    const result = await this.updateByBusinessId(id, { $set: { runningStatus } } as UpdateFilter<Template>)
    return result.modifiedCount > 0
  }

  /**
   * 查找使用特定账户的模板
   */
  public async findTemplatesUsingAccount(accountId: string): Promise<Template[]> {
    return await this.find({
      $or: [
        { 'activeControl.accounts.id': accountId },
        { 'passiveControl.accounts.id': accountId }
      ]
    } as Filter<Template>)
  }

  /**
   * 获取模板统计信息
   */
  public async getTemplateStats(): Promise<{
    total: number
    enabled: number
    running: number
    byExchange: Record<string, number>
  }> {
    const collection = await this.getCollection()
    
    const [total, enabled, running] = await Promise.all([
      this.count(),
      this.count({ status: 'enabled' } as Filter<Template>),
      this.count({ runningStatus: 'running' } as Filter<Template>)
    ])

    // 统计各交易所使用情况
    const exchangeStats = await collection.aggregate([
      {
        $project: {
          exchanges: ['$activeControl.exchange', '$passiveControl.exchange']
        }
      },
      { $unwind: '$exchanges' },
      { $group: { _id: '$exchanges', count: { $sum: 1 } } }
    ]).toArray()

    const byExchange = exchangeStats.reduce((acc, item) => {
      acc[item._id] = item.count
      return acc
    }, {} as Record<string, number>)

    return { total, enabled, running, byExchange }
  }
}

/**
 * 定时任务配置Repository
 */
export class TimedTaskConfigRepository extends BaseRepository<TimedTaskConfig> {
  constructor() {
    super(COLLECTIONS.TIMED_TASK_CONFIGS)
  }

  /**
   * 根据模板ID和控制类型查找配置
   */
  public async findByTemplateAndControl(templateId: string, controlType: 'active' | 'passive'): Promise<TimedTaskConfig | null> {
    return await this.findOne({ templateId, controlType } as Filter<TimedTaskConfig>)
  }

  /**
   * 查找正在运行的任务配置
   */
  public async findRunningConfigs(): Promise<TimedTaskConfig[]> {
    return await this.find({ isRunning: true } as Filter<TimedTaskConfig>)
  }

  /**
   * 更新任务运行状态
   */
  public async updateRunningStatus(templateId: string, controlType: 'active' | 'passive', isRunning: boolean): Promise<boolean> {
    const result = await this.updateOne(
      { templateId, controlType } as Filter<TimedTaskConfig>,
      { $set: { isRunning } } as UpdateFilter<TimedTaskConfig>
    )
    return result.modifiedCount > 0
  }

  /**
   * 保存或更新配置
   */
  public async upsertConfig(config: Omit<TimedTaskConfig, '_id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const collection = await this.getCollection()
    const now = new Date()
    
    await collection.replaceOne(
      { templateId: config.templateId, controlType: config.controlType },
      {
        ...config,
        createdAt: now,
        updatedAt: now
      } as TimedTaskConfig,
      { upsert: true }
    )
  }

  /**
   * 删除模板相关的所有配置
   */
  public async deleteByTemplate(templateId: string): Promise<void> {
    await this.deleteMany({ templateId } as Filter<TimedTaskConfig>)
  }
}

/**
 * 定时任务历史Repository
 */
export class TimedTaskHistoryRepository extends BaseRepository<TimedTaskHistory> {
  constructor() {
    super(COLLECTIONS.TIMED_TASK_HISTORIES)
  }

  /**
   * 根据模板ID查找历史记录
   */
  public async findByTemplate(templateId: string, limit: number = 50): Promise<TimedTaskHistory[]> {
    return await this.find(
      { templateId } as Filter<TimedTaskHistory>,
      { sort: { startTime: -1 }, limit }
    )
  }

  /**
   * 根据模板ID和控制类型查找历史记录
   */
  public async findByTemplateAndControl(
    templateId: string,
    controlType: 'active' | 'passive',
    limit: number = 50
  ): Promise<TimedTaskHistory[]> {
    return await this.find(
      { templateId, controlType } as Filter<TimedTaskHistory>,
      { sort: { startTime: -1 }, limit }
    )
  }

  /**
   * 查找正在运行的任务
   */
  public async findRunningTasks(): Promise<TimedTaskHistory[]> {
    return await this.find({ status: 'running' } as Filter<TimedTaskHistory>)
  }

  /**
   * 结束任务执行
   */
  public async endTask(
    id: string,
    status: 'completed' | 'failed' | 'stopped',
    errorMessage?: string
  ): Promise<boolean> {
    const updateData: any = {
      endTime: new Date(),
      status
    }
    
    if (errorMessage) {
      updateData.errorMessage = errorMessage
    }

    const result = await this.updateByBusinessId(id, { $set: updateData } as UpdateFilter<TimedTaskHistory>)
    return result.modifiedCount > 0
  }

  /**
   * 更新执行统计
   */
  public async updateStats(
    id: string,
    stats: {
      totalOrders?: number
      successfulOrders?: number
      failedOrders?: number
      totalVolume?: number
    }
  ): Promise<boolean> {
    const result = await this.updateByBusinessId(id, { $inc: stats } as UpdateFilter<TimedTaskHistory>)
    return result.modifiedCount > 0
  }

  /**
   * 获取模板执行统计
   */
  public async getTemplateStats(templateId: string, days: number = 30): Promise<{
    totalExecutions: number
    successRate: number
    totalVolume: number
    avgOrdersPerExecution: number
  }> {
    const collection = await this.getCollection()
    const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    const stats = await collection.aggregate([
      {
        $match: {
          templateId,
          startTime: { $gte: dateThreshold },
          status: { $in: ['completed', 'failed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalExecutions: { $sum: 1 },
          completedExecutions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalVolume: { $sum: '$totalVolume' },
          totalOrders: { $sum: '$totalOrders' }
        }
      }
    ]).toArray()

    const result = stats[0] || {
      totalExecutions: 0,
      completedExecutions: 0,
      totalVolume: 0,
      totalOrders: 0
    }

    return {
      totalExecutions: result.totalExecutions,
      successRate: result.totalExecutions > 0 ? (result.completedExecutions / result.totalExecutions) * 100 : 0,
      totalVolume: result.totalVolume,
      avgOrdersPerExecution: result.totalExecutions > 0 ? result.totalOrders / result.totalExecutions : 0
    }
  }
}

/**
 * 订单执行记录Repository
 */
export class OrderExecutionRepository extends BaseRepository<OrderExecution> {
  constructor() {
    super(COLLECTIONS.ORDER_EXECUTIONS)
  }

  /**
   * 根据历史ID查找订单记录
   */
  public async findByHistory(historyId: string): Promise<OrderExecution[]> {
    return await this.find(
      { historyId } as Filter<OrderExecution>,
      { sort: { executionTime: -1 } }
    )
  }

  /**
   * 根据模板ID查找订单记录
   */
  public async findByTemplate(templateId: string, limit: number = 100): Promise<OrderExecution[]> {
    return await this.find(
      { templateId } as Filter<OrderExecution>,
      { sort: { executionTime: -1 }, limit }
    )
  }

  /**
   * 根据账户ID查找订单记录
   */
  public async findByAccount(accountId: string, limit: number = 100): Promise<OrderExecution[]> {
    return await this.find(
      { accountId } as Filter<OrderExecution>,
      { sort: { executionTime: -1 }, limit }
    )
  }

  /**
   * 更新订单状态
   */
  public async updateOrderStatus(
    id: string,
    status: 'filled' | 'partially_filled' | 'cancelled' | 'failed',
    executedSize?: number,
    executedPrice?: number,
    exchangeResponse?: any,
    errorMessage?: string
  ): Promise<boolean> {
    const updateData: any = { status }
    
    if (executedSize !== undefined) updateData.executedSize = executedSize
    if (executedPrice !== undefined) updateData.executedPrice = executedPrice
    if (exchangeResponse) updateData.exchangeResponse = exchangeResponse
    if (errorMessage) updateData.errorMessage = errorMessage

    const result = await this.updateByBusinessId(id, { $set: updateData } as UpdateFilter<OrderExecution>)
    return result.modifiedCount > 0
  }
}

/**
 * 系统日志Repository
 */
export class SystemLogRepository extends BaseRepository<SystemLog> {
  constructor() {
    super(COLLECTIONS.SYSTEM_LOGS)
  }

  /**
   * 记录日志
   */
  public async log(
    level: 'info' | 'warn' | 'error' | 'debug',
    module: string,
    action: string,
    message: string,
    data?: any,
    templateId?: string
  ): Promise<void> {
    const logEntry: SystemLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      module,
      action,
      message,
      data,
      templateId,
      createdAt: new Date()
    }

    await this.insertOne(logEntry)
  }

  /**
   * 根据级别查询日志
   */
  public async findByLevel(level: 'info' | 'warn' | 'error' | 'debug', limit: number = 100): Promise<SystemLog[]> {
    return await this.find(
      { level } as Filter<SystemLog>,
      { sort: { createdAt: -1 }, limit }
    )
  }

  /**
   * 根据模块查询日志
   */
  public async findByModule(module: string, limit: number = 100): Promise<SystemLog[]> {
    return await this.find(
      { module } as Filter<SystemLog>,
      { sort: { createdAt: -1 }, limit }
    )
  }

  /**
   * 根据模板ID查询日志
   */
  public async findByTemplate(templateId: string, limit: number = 100): Promise<SystemLog[]> {
    return await this.find(
      { templateId } as Filter<SystemLog>,
      { sort: { createdAt: -1 }, limit }
    )
  }

  /**
   * 清理旧日志 (手动清理，TTL索引会自动清理30天前的日志)
   */
  public async cleanOldLogs(days: number = 30): Promise<number> {
    const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const result = await this.deleteMany({ createdAt: { $lt: dateThreshold } } as Filter<SystemLog>)
    return result.deletedCount
  }
}

// 导出Repository实例
export const templateRepository = new TemplateRepository()
export const timedTaskConfigRepository = new TimedTaskConfigRepository()
export const timedTaskHistoryRepository = new TimedTaskHistoryRepository()
export const orderExecutionRepository = new OrderExecutionRepository()
export const systemLogRepository = new SystemLogRepository()