import { ObjectId } from 'mongodb'

// 基础文档接口
export interface BaseDocument {
  _id?: string | ObjectId
  createdAt: Date
  updatedAt: Date
}

// 交易所常量
export const EXCHANGES = {
  BINANCE: 'binance',
  BYBIT: 'bybit', 
  BITGET: 'bitget',
  OKX: 'okx'
} as const

export type ExchangeType = typeof EXCHANGES[keyof typeof EXCHANGES]

// 交易所账户配置
export interface ExchangeAccount extends BaseDocument {
  name: string                    // 账户名称（用户自定义）
  exchange: ExchangeType          // 交易所类型
  apiKey: string                  // API密钥
  secretKey: string               // 密钥
  passphrase?: string             // 密码短语（OKX、Bitget需要）
  isTestnet: boolean              // 是否为测试网
  status: 'active' | 'inactive' | 'error'  // 账户状态
  lastHealthCheck?: Date          // 最后健康检查时间
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown'  // 健康状态
  balance?: {                     // 账户余额（缓存）
    [currency: string]: {
      available: number
      frozen: number
      total: number
    }
  }
  metadata?: {                    // 扩展元数据
    rateLimit?: number            // 请求限制
    permissions?: string[]        // API权限
    [key: string]: any
  }
}

// 交易模板
export interface TradingTemplate extends BaseDocument {
  name: string                    // 模板名称
  description?: string            // 模板描述
  symbol: string                  // 交易对（如 BTCUSDT）
  status: 'enabled' | 'disabled'  // 模板状态
  
  // 主动控制配置
  activeControl: {
    accountIds: string[]          // 关联的交易所账户ID列表
    executionMode: 'loop' | 'random'  // 账户执行模式
    isEnabled: boolean            // 是否启用主动控制
  }
  
  // 被动控制配置
  passiveControl: {
    accountIds: string[]          // 关联的交易所账户ID列表
    executionMode: 'loop' | 'random'  // 账户执行模式
    isEnabled: boolean            // 是否启用被动控制
  }
  
  // 风险控制
  riskControl: {
    maxPositionSize: number       // 最大持仓数量
    maxDailyLoss: number          // 每日最大亏损
    maxOrderSize: number          // 单笔最大订单数量
    allowedOrderTypes: string[]   // 允许的订单类型
  }
  
  metadata?: {
    createdBy?: string            // 创建者
    tags?: string[]               // 标签
    [key: string]: any
  }
}

// 定时任务配置
export interface TimedTaskConfig extends BaseDocument {
  templateId: string              // 关联模板ID
  controlType: 'active' | 'passive'  // 控制类型
  name: string                    // 任务名称
  
  // 任务参数
  config: {
    minSize: number               // 最小下单数量
    maxSize: number               // 最大下单数量
    buySell: 'buy' | 'sell' | 'both'  // 买卖方向
    orderBookLevel: number        // 订单薄层级
    orderType: 'limit' | 'market' | 'conditional'  // 订单类型
    eatLimit: number              // 吃单限制
    minTime: number               // 最小时间间隔（秒）
    maxTime: number               // 最大时间间隔（秒）
    maxTradeAmount: number        // 最大交易量
    amountType: 'USDT' | 'TOKEN'  // 交易量类型
    
    // 高级配置
    priceOffset?: number          // 价格偏移量
    stopLoss?: number             // 止损价格
    takeProfit?: number           // 止盈价格
    leverage?: number             // 杠杆倍数
  }
  
  // 任务状态
  status: 'pending' | 'running' | 'paused' | 'stopped' | 'error'  // 任务状态
  isEnabled: boolean              // 是否启用
  
  // 执行统计
  statistics: {
    totalExecutions: number       // 总执行次数
    successfulExecutions: number  // 成功执行次数
    failedExecutions: number      // 失败执行次数
    lastExecution?: Date          // 最后执行时间
    nextExecution?: Date          // 下次执行时间
    averageExecutionTime: number  // 平均执行时间（毫秒）
  }
  
  // 调度信息
  schedule?: {
    cronExpression?: string       // Cron表达式
    timezone?: string             // 时区
    startTime?: Date              // 开始时间
    endTime?: Date                // 结束时间
  }
}

// 订单记录
export interface OrderRecord extends BaseDocument {
  templateId: string              // 模板ID
  timedTaskId?: string            // 定时任务ID（如果是定时任务产生的订单）
  accountId: string               // 账户ID
  
  // 订单信息
  symbol: string                  // 交易对
  side: 'buy' | 'sell'            // 买卖方向
  type: 'limit' | 'market' | 'conditional'  // 订单类型
  amount: number                  // 数量
  price?: number                  // 价格
  leverage?: number               // 杠杆倍数
  
  // 交易所信息
  exchangeOrderId?: string        // 交易所订单ID
  clientOrderId: string           // 客户端订单ID
  
  // 状态跟踪
  status: 'pending' | 'open' | 'filled' | 'cancelled' | 'rejected' | 'expired'
  filledAmount: number            // 已成交数量
  remainingAmount: number         // 剩余数量
  averagePrice?: number           // 平均成交价格
  
  // 时间信息
  submittedAt: Date               // 提交时间
  filledAt?: Date                 // 成交时间
  cancelledAt?: Date              // 取消时间
  
  // 费用信息
  fee?: number                    // 手续费
  feeCurrency?: string            // 手续费币种
  
  // 控制信息
  controlType: 'active' | 'passive' | 'manual'  // 控制类型
  isTimedTask: boolean            // 是否为定时任务
  
  metadata?: {
    reason?: string               // 订单原因（止损、止盈等）
    strategy?: string             // 策略名称
    [key: string]: any
  }
}

// 交易记录
export interface TradeRecord extends BaseDocument {
  orderId: string                 // 关联订单ID
  templateId: string              // 模板ID
  accountId: string               // 账户ID
  
  // 交易信息
  symbol: string                  // 交易对
  side: 'buy' | 'sell'            // 买卖方向
  amount: number                  // 成交数量
  price: number                   // 成交价格
  value: number                   // 成交金额
  leverage?: number               // 杠杆倍数
  
  // 交易所信息
  exchangeTradeId: string         // 交易所交易ID
  
  // 费用信息
  fee: number                     // 手续费
  feeCurrency: string             // 手续费币种
  
  // 时间信息
  executedAt: Date                // 执行时间
  
  // 盈亏信息
  pnl?: number                    // 盈亏
  pnlCurrency?: string            // 盈亏币种
  
  metadata?: {
    marketMaker?: boolean         // 是否为挂单方
    [key: string]: any
  }
}

// 持仓记录
export interface PositionRecord extends BaseDocument {
  accountId: string               // 账户ID
  symbol: string                  // 交易对
  
  // 持仓信息
  side: 'long' | 'short'          // 持仓方向
  size: number                    // 持仓数量
  leverage: number                // 杠杆倍数
  entryPrice: number              // 开仓价格
  markPrice: number               // 标记价格
  
  // 盈亏信息
  unrealizedPnl: number           // 未实现盈亏
  realizedPnl: number             // 已实现盈亏
  
  // 保证金信息
  margin: number                  // 保证金
  marginRatio: number             // 保证金率
  liquidationPrice?: number       // 强平价格
  
  // 时间信息
  openedAt: Date                  // 开仓时间
  lastUpdated: Date               // 最后更新时间
  
  metadata?: {
    autoReduceOnly?: boolean      // 是否只减仓
    [key: string]: any
  }
}

// WebSocket连接记录
export interface WebSocketConnection extends BaseDocument {
  accountId: string               // 账户ID
  exchange: ExchangeType          // 交易所
  connectionId: string            // 连接ID
  
  // 连接状态
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  
  // 订阅信息
  subscriptions: {
    channel: string               // 频道名称
    symbol?: string               // 交易对（可选）
    subscribed: boolean           // 是否已订阅
    subscribedAt?: Date           // 订阅时间
  }[]
  
  // 连接信息
  connectedAt?: Date              // 连接时间
  disconnectedAt?: Date           // 断开时间
  lastHeartbeat?: Date            // 最后心跳时间
  
  // 错误信息
  errorCount: number              // 错误次数
  lastError?: string              // 最后错误信息
  
  metadata?: {
    reconnectAttempts?: number    // 重连尝试次数
    [key: string]: any
  }
}

// 系统配置
export interface SystemConfig extends BaseDocument {
  key: string                     // 配置键
  value: any                      // 配置值
  description?: string            // 描述
  category: 'trading' | 'risk' | 'notification' | 'system'  // 分类
  isEncrypted?: boolean           // 是否加密
}

// 日志记录
export interface LogRecord extends BaseDocument {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'  // 日志级别
  message: string                 // 日志消息
  
  // 上下文信息
  context: {
    templateId?: string           // 模板ID
    accountId?: string            // 账户ID
    orderId?: string              // 订单ID
    taskId?: string               // 任务ID
    exchange?: ExchangeType       // 交易所
    symbol?: string               // 交易对
    [key: string]: any
  }
  
  // 分类信息
  source: 'template' | 'account' | 'order' | 'task' | 'websocket' | 'system'
  category?: string               // 子分类
  
  // 错误信息
  error?: {
    name: string                  // 错误名称
    message: string               // 错误消息
    stack?: string                // 错误堆栈
    code?: string                 // 错误代码
  }
  
  // 性能信息
  performance?: {
    duration: number              // 执行时间（毫秒）
    memoryUsage: number           // 内存使用量
    cpuUsage: number              // CPU使用率
  }
}