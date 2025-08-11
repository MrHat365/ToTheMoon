// 交易所基础接口定义

export interface ExchangeConfig {
  apiKey: string
  secretKey: string
  passphrase?: string
  sandbox?: boolean
  testnet?: boolean
}

export interface OrderBook {
  symbol: string
  bids: [string, string][] // [price, quantity]
  asks: [string, string][] // [price, quantity]
  timestamp: number
}

export interface Ticker {
  symbol: string
  price: string
  volume: string
  high24h: string
  low24h: string
  change24h: string
  changePercent24h: string
  timestamp: number
}

export interface Balance {
  currency: string
  available: string
  frozen: string
  total: string
}

export interface OrderRequest {
  symbol: string
  type: 'market' | 'limit' | 'stop' | 'stop_limit'
  side: 'buy' | 'sell'
  amount: string
  price?: string
  timeInForce?: 'GTC' | 'IOC' | 'FOK'
  clientOrderId?: string
}

export interface OrderResponse {
  orderId: string
  clientOrderId?: string
  symbol: string
  type: string
  side: string
  amount: string
  price?: string
  status: 'open' | 'filled' | 'cancelled' | 'rejected'
  timestamp: number
}

export interface TradeData {
  tradeId: string
  orderId: string
  symbol: string
  side: 'buy' | 'sell'
  amount: string
  price: string
  fee: string
  feeCurrency: string
  timestamp: number
}

export interface WebSocketData {
  channel: string
  symbol: string
  data: any
  timestamp: number
}

// 交易所连接器基础接口
export interface ExchangeConnector {
  // 基础配置
  name: string
  config: ExchangeConfig
  
  // 连接管理
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  
  // 市场数据
  getOrderBook(symbol: string): Promise<OrderBook>
  getTicker(symbol: string): Promise<Ticker>
  getTickers(): Promise<Ticker[]>
  
  // 账户相关
  getBalances(): Promise<Balance[]>
  getBalance(currency: string): Promise<Balance>
  
  // 订单管理
  createOrder(order: OrderRequest): Promise<OrderResponse>
  cancelOrder(orderId: string, symbol: string): Promise<boolean>
  getOrder(orderId: string, symbol: string): Promise<OrderResponse | null>
  getOrders(symbol?: string): Promise<OrderResponse[]>
  getOrderHistory(symbol?: string): Promise<OrderResponse[]>
  
  // 交易历史
  getTrades(symbol?: string): Promise<TradeData[]>
  
  // WebSocket相关
  subscribeOrderBook(symbol: string, callback: (data: OrderBook) => void): Promise<void>
  subscribeTicker(symbol: string, callback: (data: Ticker) => void): Promise<void>
  subscribeOrders(callback: (data: OrderResponse) => void): Promise<void>
  subscribeTrades(callback: (data: TradeData) => void): Promise<void>
  unsubscribe(channel: string, symbol?: string): Promise<void>
  unsubscribeAll(): Promise<void>
}

// 交易所工厂接口
export interface ExchangeFactory {
  createExchange(exchangeName: string, config: ExchangeConfig): ExchangeConnector
  getSupportedExchanges(): string[]
}