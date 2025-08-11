import { ObjectId } from 'mongodb'

/**
 * 数据库工具函数
 */

/**
 * 生成唯一的业务ID
 */
export function generateBusinessId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 9)
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`
}

/**
 * 验证ObjectId格式
 */
export function isValidObjectId(id: string): boolean {
  try {
    return ObjectId.isValid(id) && new ObjectId(id).toString() === id
  } catch {
    return false
  }
}

/**
 * 转换为ObjectId
 */
export function toObjectId(id: string): ObjectId | null {
  try {
    return new ObjectId(id)
  } catch {
    return null
  }
}

/**
 * 生成时间范围查询条件
 */
export function createDateRange(startDate?: Date, endDate?: Date): any {
  const query: any = {}
  
  if (startDate || endDate) {
    query.createdAt = {}
    if (startDate) query.createdAt.$gte = startDate
    if (endDate) query.createdAt.$lte = endDate
  }
  
  return query
}

/**
 * 生成分页参数
 */
export function createPaginationOptions(page: number = 1, limit: number = 10) {
  const skip = Math.max(0, (page - 1) * limit)
  const safeLimit = Math.max(1, Math.min(100, limit)) // 限制最大100条
  
  return {
    skip,
    limit: safeLimit,
    page: Math.max(1, page)
  }
}

/**
 * 生成排序参数
 */
export function createSortOptions(sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc') {
  return {
    [sortBy]: sortOrder === 'asc' ? 1 : -1
  }
}

/**
 * 清理空值和undefined的字段
 */
export function cleanDocument<T extends Record<string, any>>(doc: T): Partial<T> {
  const cleaned: Partial<T> = {}
  
  for (const [key, value] of Object.entries(doc)) {
    if (value !== null && value !== undefined && value !== '') {
      cleaned[key as keyof T] = value
    }
  }
  
  return cleaned
}

/**
 * 创建更新操作对象
 */
export function createUpdateOperation<T extends Record<string, any>>(
  updates: Partial<T>,
  options: {
    upsert?: boolean
    setOnInsert?: Partial<T>
  } = {}
): any {
  const cleanedUpdates = cleanDocument(updates)
  const operation: any = {}
  
  if (Object.keys(cleanedUpdates).length > 0) {
    operation.$set = {
      ...cleanedUpdates,
      updatedAt: new Date()
    }
  }
  
  if (options.setOnInsert) {
    operation.$setOnInsert = {
      ...options.setOnInsert,
      createdAt: new Date()
    }
  }
  
  return operation
}

/**
 * 数据库错误处理
 */
export class DatabaseError extends Error {
  public readonly code?: number
  public readonly operation?: string
  public readonly collection?: string
  
  constructor(
    message: string,
    options: {
      code?: number
      operation?: string
      collection?: string
      cause?: Error
    } = {}
  ) {
    super(message)
    this.name = 'DatabaseError'
    this.code = options.code
    this.operation = options.operation
    this.collection = options.collection
    this.cause = options.cause
  }
  
  static from(error: any, context?: { operation?: string; collection?: string }): DatabaseError {
    if (error instanceof DatabaseError) {
      return error
    }
    
    const message = error.message || '数据库操作失败'
    const code = error.code || error.errno
    
    return new DatabaseError(message, {
      code,
      operation: context?.operation,
      collection: context?.collection,
      cause: error
    })
  }
}

/**
 * 重试装饰器
 */
export function withRetry<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    retries?: number
    delay?: number
    backoff?: boolean
  } = {}
) {
  const { retries = 3, delay = 1000, backoff = true } = options
  
  return async (...args: T): Promise<R> => {
    let lastError: Error
    
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn(...args)
      } catch (error: any) {
        lastError = error
        
        if (i === retries) {
          throw DatabaseError.from(error, { operation: fn.name })
        }
        
        // 计算延迟时间
        const currentDelay = backoff ? delay * Math.pow(2, i) : delay
        await new Promise(resolve => setTimeout(resolve, currentDelay))
      }
    }
    
    throw lastError!
  }
}

/**
 * 性能监控装饰器
 */
export function withPerformanceMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    logSlow?: boolean
    slowThreshold?: number
    logger?: (message: string, duration: number) => void
  } = {}
) {
  const { logSlow = true, slowThreshold = 1000, logger = console.warn } = options
  
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    
    try {
      const result = await fn(...args)
      const duration = Date.now() - startTime
      
      if (logSlow && duration > slowThreshold) {
        logger(`慢查询警告: ${fn.name} 耗时 ${duration}ms`, duration)
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger(`数据库操作失败: ${fn.name} 耗时 ${duration}ms`, duration)
      throw error
    }
  }
}

/**
 * 数据库健康检查
 */
export async function performHealthCheck(): Promise<{
  isHealthy: boolean
  responseTime: number
  error?: string
}> {
  const startTime = Date.now()
  
  try {
    const DatabaseClient = (await import('./client')).default
    const isHealthy = await DatabaseClient.isHealthy()
    const responseTime = Date.now() - startTime
    
    return {
      isHealthy,
      responseTime
    }
  } catch (error: any) {
    return {
      isHealthy: false,
      responseTime: Date.now() - startTime,
      error: error.message
    }
  }
}