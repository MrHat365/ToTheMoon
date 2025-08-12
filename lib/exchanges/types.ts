// 永续合约交易所统一接口类型定义

export interface FuturesAccountInfo {
  accountId: string
  name: string
  balance: number
  availableBalance: number
  unrealizedPnl: number
  marginRatio: number
  totalWalletBalance: number
  totalUnrealizedPnL: number
  totalMarginBalance: number
  totalMaintMargin: number
  totalInitialMargin: number
  maxWithdrawAmount: number
}

export interface FuturesPosition {
  symbol: string
  side: 'long' | 'short' | 'both'
  size: number
  notional: number
  entryPrice: number
  markPrice: number
  unrealizedPnl: number
  percentage: number
  leverage: number
  marginType: 'isolated' | 'cross'
  liquidationPrice: number
  timestamp: number
}

export interface FuturesOrder {
  orderId: string
  clientOrderId?: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop' | 'stop_market' | 'take_profit' | 'take_profit_market'
  amount: number
  price?: number
  stopPrice?: number
  status: 'new' | 'partially_filled' | 'filled' | 'canceled' | 'rejected' | 'expired'
  timeInForce?: 'GTC' | 'IOC' | 'FOK'
  filled: number
  remaining: number
  cost: number
  average?: number
  fee: number
  feeCurrency: string
  timestamp: number
  datetime: string
  lastTradeTimestamp?: number
  positionSide?: 'long' | 'short' | 'both'
  reduceOnly?: boolean
}

export interface FuturesOrderBook {
  symbol: string
  bids: [number, number][] // [price, amount]
  asks: [number, number][] // [price, amount]
  timestamp: number
  datetime: string
  nonce?: number
}

export interface FuturesTicker {
  symbol: string
  high: number
  low: number
  bid: number
  bidVolume: number
  ask: number
  askVolume: number
  vwap?: number
  open: number
  close: number
  last: number
  previousClose?: number
  change: number
  percentage: number
  average?: number
  baseVolume: number
  quoteVolume: number
  timestamp: number
  datetime: string
}

export interface FuturesTrade {
  id: string
  timestamp: number
  datetime: string
  symbol: string
  side: 'buy' | 'sell'
  amount: number
  price: number
  cost: number
  fee?: {
    cost: number
    currency: string
  }
}

export interface FuturesBalance {
  currency: string
  free: number
  used: number
  total: number
}

export interface OrderRequest {
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  amount: number
  price?: number
  timeInForce?: 'GTC' | 'IOC' | 'FOK'
  positionSide?: 'long' | 'short' | 'both'
  reduceOnly?: boolean
  closePosition?: boolean
}

export interface WebSocketMessage {
  type: string
  data: any
  timestamp: number
}

export interface KlineData {
  symbol: string
  openTime: number
  closeTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  interval: string
  count: number
}

// WebSocket 订阅主题
export enum WSSubscriptionType {
  TICKER = 'ticker',
  ORDERBOOK = 'orderbook', 
  KLINE = 'kline',
  TRADE = 'trade',
  ACCOUNT = 'account',
  ORDER = 'order',
  POSITION = 'position'
}

// 永续合约交易所基础接口
export interface FuturesExchangeInterface {
  // 基础信息
  getName(): string
  isConnected(): boolean
  
  // 连接管理
  connect(credentials: ExchangeCredentials): Promise<void>
  disconnect(): Promise<void>
  
  // 账户信息
  getFuturesAccount(): Promise<FuturesAccountInfo>
  getFuturesBalances(): Promise<FuturesBalance[]>
  getFuturesPositions(symbol?: string): Promise<FuturesPosition[]>
  
  // 市场数据
  getFuturesTicker(symbol: string): Promise<FuturesTicker>
  getFuturesOrderBook(symbol: string, limit?: number): Promise<FuturesOrderBook>
  getFuturesTrades(symbol: string, limit?: number): Promise<FuturesTrade[]>
  
  // 交易操作
  createFuturesOrder(params: OrderRequest): Promise<FuturesOrder>
  cancelFuturesOrder(orderId: string, symbol: string): Promise<FuturesOrder>
  getFuturesOrder(orderId: string, symbol: string): Promise<FuturesOrder>
  getFuturesOrders(symbol?: string, limit?: number): Promise<FuturesOrder[]>
  getFuturesOpenOrders(symbol?: string): Promise<FuturesOrder[]>
  
  // WebSocket
  subscribeWebSocket(type: WSSubscriptionType, symbol?: string, callback?: (data: WebSocketMessage) => void): void
  unsubscribeWebSocket(type: WSSubscriptionType, symbol?: string): void
  
  // 杠杆和保证金
  setLeverage(symbol: string, leverage: number): Promise<any>
  setMarginType(symbol: string, marginType: 'isolated' | 'cross'): Promise<any>
}

export interface ExchangeCredentials {
  apiKey: string
  apiSecret: string
  passphrase?: string // OKX需要
  sandbox?: boolean
}

export interface ExchangeConfig {
  name: string
  credentials: ExchangeCredentials
  options?: {
    timeout?: number
    rateLimit?: number
    enableRateLimit?: boolean
    sandbox?: boolean
  }
}

// 交易所错误类型
export class ExchangeError extends Error {
  constructor(
    message: string,
    public code?: string,
    public exchange?: string
  ) {
    super(message)
    this.name = 'ExchangeError'
  }
}

export class NetworkError extends ExchangeError {
  constructor(message: string, exchange?: string) {
    super(message, 'NETWORK_ERROR', exchange)
    this.name = 'NetworkError'
  }
}

export class AuthenticationError extends ExchangeError {
  constructor(message: string, exchange?: string) {
    super(message, 'AUTH_ERROR', exchange)
    this.name = 'AuthenticationError'
  }
}

export class InsufficientFunds extends ExchangeError {
  constructor(message: string, exchange?: string) {
    super(message, 'INSUFFICIENT_FUNDS', exchange)
    this.name = 'InsufficientFunds'
  }
}

export class InvalidOrder extends ExchangeError {
  constructor(message: string, exchange?: string) {
    super(message, 'INVALID_ORDER', exchange)
    this.name = 'InvalidOrder'
  }
}

export class OrderNotFound extends ExchangeError {
  constructor(message: string, exchange?: string) {
    super(message, 'ORDER_NOT_FOUND', exchange)
    this.name = 'OrderNotFound'
  }
}

export class RateLimitExceeded extends ExchangeError {
  constructor(message: string, exchange?: string) {
    super(message, 'RATE_LIMIT_EXCEEDED', exchange)
    this.name = 'RateLimitExceeded'
  }
}