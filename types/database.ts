import { ObjectId } from 'mongodb'

// 基础文档接口
export interface BaseDocument {
  _id?: string | ObjectId
  createdAt: Date
  updatedAt: Date
}

// 账户接口
export interface Account extends BaseDocument {
  name: string
  apiKey: string
  secretKey: string
  passphrase: string
  exchange: 'Binance' | 'Coinbase' | 'Kraken' | 'Bitget' | 'Bybit' | 'OKX'
  status: 'active' | 'inactive'
  balance?: {
    [currency: string]: number
  }
}

// 控制配置接口
export interface ControlConfig extends BaseDocument {
  exchange: string
  accountIds: string[] // 关联的账户ID数组
  executionMode: 'loop' | 'random'
}

// 定时任务配置接口
export interface TimedTaskConfig {
  minSize: number
  maxSize: number
  buySell: 'buy' | 'sell'
  orderBookLevel: string
  orderType: 'GTC LIMIT' | 'IOC LIMIT' | 'MARKET'
  eatLimit: number
  minTime: number // 秒
  maxTime: number // 秒
  maxTradeAmount: number // 新增：最大交易量
  amountType: 'USDT' | 'TOKEN' // 新增：交易量类型
  isRunning: boolean
}

// 手动订单配置接口
export interface ManualOrderConfig {
  gtcLimit: {
    size: number
    buySell: 'buy' | 'sell'
    level: string
    price?: number // 被动控制才有价格
  }
  iocLimit: {
    size: number
    buySell: 'buy' | 'sell'
    level: string
    price?: number // 被动控制才有价格
  }
  market: {
    size: number
    buySell: 'buy' | 'sell'
    level: string
    price?: number // 被动控制才有价格
  }
}

// 模板接口
export interface Template extends BaseDocument {
  name: string
  status: 'enabled' | 'disabled'
  runningStatus: 'running' | 'stopped'
  symbol: string // 交易对，如 BTC/USDT
  activeControl: {
    controlConfigId: string // 关联控制配置ID
    selectedAccountIds: string[] // 选中的账户ID
    executionMode: 'loop' | 'random'
    manualOrders: ManualOrderConfig
    timedTask: TimedTaskConfig
  }
  passiveControl: {
    controlConfigId: string // 关联控制配置ID
    selectedAccountIds: string[] // 选中的账户ID
    executionMode: 'loop' | 'random'
    manualOrders: ManualOrderConfig
    timedTask: TimedTaskConfig
  }
}

// 订单接口
export interface Order extends BaseDocument {
  templateId: string
  accountId: string
  symbol: string
  type: 'GTC LIMIT' | 'IOC LIMIT' | 'MARKET'
  side: 'buy' | 'sell'
  amount: number
  price?: number
  status: 'pending' | 'filled' | 'cancelled' | 'failed'
  orderId?: string // 交易所返回的订单ID
  executedAt?: Date
  controlType: 'active' | 'passive'
  isTimedTask: boolean // 是否为定时任务订单
  metadata?: {
    orderBookLevel?: string
    eatLimit?: number
    [key: string]: any
  }
}

// 交易记录接口
export interface TradeRecord extends BaseDocument {
  orderId: string
  templateId: string
  accountId: string
  symbol: string
  side: 'buy' | 'sell'
  amount: number
  price: number
  fee: number
  feeCurrency: string
  tradeId: string // 交易所返回的成交ID
  executedAt: Date
  controlType: 'active' | 'passive'
}

// 系统配置接口
export interface SystemConfig extends BaseDocument {
  key: string
  value: any
  description?: string
  category: 'exchange' | 'trading' | 'system' | 'notification'
}

// 日志接口
export interface Log extends BaseDocument {
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  context?: {
    templateId?: string
    accountId?: string
    orderId?: string
    [key: string]: any
  }
  source: 'template' | 'account' | 'order' | 'system' | 'exchange'
}