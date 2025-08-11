import { ObjectId } from 'mongodb'

/**
 * 数据库Schema定义 - 基于实际页面功能设计
 */

// ===== 基础数据类型 =====

/**
 * 交易所常量 - 基于template-dialog.tsx中的实际选项
 */
export const EXCHANGES = {
  BINANCE: 'Binance',
  COINBASE: 'Coinbase',
  KRAKEN: 'Kraken'
} as const

export type ExchangeType = typeof EXCHANGES[keyof typeof EXCHANGES]

/**
 * 订单类型 - 基于控制中心页面的实际订单类型
 */
export const ORDER_TYPES = {
  GTC_LIMIT: 'GTC LIMIT',
  IOC_LIMIT: 'IOC LIMIT', 
  MARKET: 'MARKET'
} as const

export type OrderType = typeof ORDER_TYPES[keyof typeof ORDER_TYPES]

/**
 * 买卖方向
 */
export const TRADE_SIDES = {
  BUY: 'buy',
  SELL: 'sell'
} as const

export type TradeSide = typeof TRADE_SIDES[keyof typeof TRADE_SIDES]

/**
 * 执行模式 - 基于页面实际功能
 */
export const EXECUTION_MODES = {
  LOOP: 'loop',
  RANDOM: 'random'
} as const

export type ExecutionMode = typeof EXECUTION_MODES[keyof typeof EXECUTION_MODES]

/**
 * 金额类型 - 基于控制中心的USDT/TOKEN切换按钮
 */
export const AMOUNT_TYPES = {
  USDT: 'USDT',
  TOKEN: 'TOKEN'
} as const

export type AmountType = typeof AMOUNT_TYPES[keyof typeof AMOUNT_TYPES]

// ===== 模板相关Schema =====

/**
 * 账户信息 - 基于template-dialog.tsx的账户结构
 */
export interface Account {
  id: string // 账户业务ID
  name: string // 账户名称
  apiKey: string // API Key
  secretKey: string // Secret Key  
  passphrase: string // Passphrase
}

/**
 * 控制配置 - 主动控制或被动控制
 */
export interface ControlConfig {
  exchange: ExchangeType // 交易所
  accounts: Account[] // 账户列表（直接嵌套存储）
  executionMode: ExecutionMode // 执行模式：循环或随机
}

/**
 * 交易模板 - 基于实际页面结构
 */
export interface Template {
  _id?: ObjectId
  id: string // 业务ID
  name: string // 模板名称
  status: 'enabled' | 'disabled' // 模板状态
  runningStatus: 'running' | 'stopped' // 运行状态
  activeControl: ControlConfig // 主动控制配置
  passiveControl: ControlConfig // 被动控制配置
  createdAt: Date
  updatedAt: Date
}

// ===== 定时任务相关Schema =====

/**
 * 定时任务配置 - 基于控制中心页面的实际参数
 */
export interface TimedTaskConfig {
  _id?: ObjectId
  templateId: string // 关联的模板ID
  controlType: 'active' | 'passive' // 控制类型：主动或被动
  
  // 基础参数 (基于页面实际字段)
  symbol: string // 交易对，如 BTC/USDT
  minSize: number // Size (Min) - 最小交易数量
  maxSize: number // Size (Max) - 最大交易数量
  tradeSide: TradeSide // 买/卖 - 买卖方向
  orderType: OrderType // 订单类型
  
  // 时间参数
  minTime: number // 时间 (Min, 秒) - 最小间隔时间
  maxTime: number // 时间 (Max, 秒) - 最大间隔时间
  
  // 限制参数
  maxTradeAmount: number // 最大交易量
  amountType: AmountType // 金额类型：USDT/TOKEN 切换按钮
  
  // 主动控制特有参数
  orderBookLevel?: number // OrderBook Level (1-10)
  eatLimit?: number // 吃单限制 (仅主动控制)
  
  // 执行控制
  selectedAccountIds: string[] // 选中的执行账户ID列表
  executionMode: ExecutionMode // 执行模式 (从模板继承)
  
  // 状态信息
  isRunning: boolean // 是否正在运行
  createdAt: Date
  updatedAt: Date
}

/**
 * 定时任务执行历史记录
 */
export interface TimedTaskHistory {
  _id?: ObjectId
  id: string // 业务ID
  templateId: string // 关联的模板ID
  controlType: 'active' | 'passive' // 控制类型
  configSnapshot: Omit<TimedTaskConfig, '_id' | 'createdAt' | 'updatedAt'> // 配置快照
  
  // 执行信息
  startTime: Date // 开始时间
  endTime?: Date // 结束时间
  status: 'running' | 'stopped' | 'completed' | 'failed' // 执行状态
  
  // 执行统计
  totalOrders: number // 总订单数
  successfulOrders: number // 成功订单数
  failedOrders: number // 失败订单数
  totalVolume: number // 总交易量
  
  // 错误信息
  errorMessage?: string // 错误消息
  
  // 元数据
  createdAt: Date
  updatedAt: Date
}

/**
 * 单次订单执行记录
 */
export interface OrderExecution {
  _id?: ObjectId
  id: string // 业务ID
  historyId: string // 关联的执行历史ID
  templateId: string // 模板ID
  controlType: 'active' | 'passive' // 控制类型
  accountId: string // 执行账户ID
  
  // 订单信息
  symbol: string // 交易对
  orderType: OrderType // 订单类型
  tradeSide: TradeSide // 买卖方向
  size: number // 交易数量
  price?: number // 价格 (限价单)
  orderBookLevel?: number // OrderBook层级
  
  // 执行结果
  status: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'failed' // 订单状态
  executedSize: number // 已执行数量
  executedPrice: number // 执行价格
  
  // 交易所信息
  exchangeOrderId?: string // 交易所订单ID
  exchangeResponse?: any // 交易所响应原始数据
  
  // 时间信息
  executionTime: Date // 执行时间
  createdAt: Date
  updatedAt: Date
  
  // 错误信息
  errorMessage?: string
}

// ===== 系统日志Schema =====

/**
 * 系统操作日志
 */
export interface SystemLog {
  _id?: ObjectId
  id: string
  level: 'info' | 'warn' | 'error' | 'debug' // 日志级别
  module: string // 模块名称
  action: string // 操作类型
  message: string // 日志消息
  data?: any // 附加数据
  templateId?: string // 关联模板ID
  userId?: string // 操作用户ID (如果有用户系统)
  createdAt: Date
}

// ===== 集合名称常量 =====
export const COLLECTIONS = {
  TEMPLATES: 'templates', 
  TIMED_TASK_CONFIGS: 'timed_task_configs',
  TIMED_TASK_HISTORIES: 'timed_task_histories',
  ORDER_EXECUTIONS: 'order_executions',
  SYSTEM_LOGS: 'system_logs'
} as const

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS]