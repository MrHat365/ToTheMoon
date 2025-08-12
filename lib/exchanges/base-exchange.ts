import EventEmitter from 'events'
import {
  FuturesExchangeInterface,
  ExchangeCredentials,
  FuturesAccountInfo,
  FuturesBalance,
  FuturesPosition,
  FuturesTicker,
  FuturesOrderBook,
  FuturesTrade,
  FuturesOrder,
  OrderRequest,
  WSSubscriptionType,
  WebSocketMessage,
  ExchangeError
} from './types'

export abstract class BaseFuturesExchange extends EventEmitter implements FuturesExchangeInterface {
  protected credentials?: ExchangeCredentials
  protected connected: boolean = false
  protected wsConnected: boolean = false
  protected subscriptions: Map<string, Set<string>> = new Map()
  
  constructor(protected exchangeName: string) {
    super()
    this.setMaxListeners(100) // 增加事件监听器限制
  }

  // 基础信息
  getName(): string {
    return this.exchangeName
  }

  isConnected(): boolean {
    return this.connected
  }

  isWebSocketConnected(): boolean {
    return this.wsConnected
  }

  // 连接管理 - 子类需要实现具体逻辑
  abstract connect(credentials: ExchangeCredentials): Promise<void>
  abstract disconnect(): Promise<void>

  // 账户信息 - 子类实现
  abstract getFuturesAccount(): Promise<FuturesAccountInfo>
  abstract getFuturesBalances(): Promise<FuturesBalance[]>
  abstract getFuturesPositions(symbol?: string): Promise<FuturesPosition[]>

  // 市场数据 - 子类实现
  abstract getFuturesTicker(symbol: string): Promise<FuturesTicker>
  abstract getFuturesOrderBook(symbol: string, limit?: number): Promise<FuturesOrderBook>
  abstract getFuturesTrades(symbol: string, limit?: number): Promise<FuturesTrade[]>

  // 交易操作 - 子类实现
  abstract createFuturesOrder(params: OrderRequest): Promise<FuturesOrder>
  abstract cancelFuturesOrder(orderId: string, symbol: string): Promise<FuturesOrder>
  abstract getFuturesOrder(orderId: string, symbol: string): Promise<FuturesOrder>
  abstract getFuturesOrders(symbol?: string, limit?: number): Promise<FuturesOrder[]>
  abstract getFuturesOpenOrders(symbol?: string): Promise<FuturesOrder[]>

  // 杠杆和保证金 - 子类实现
  abstract setLeverage(symbol: string, leverage: number): Promise<any>
  abstract setMarginType(symbol: string, marginType: 'isolated' | 'cross'): Promise<any>

  // WebSocket 基础实现
  subscribeWebSocket(type: WSSubscriptionType, symbol?: string, callback?: (data: WebSocketMessage) => void): void {
    const key = this.getSubscriptionKey(type, symbol)
    
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set())
    }
    
    if (callback) {
      this.on(key, callback)
    }
    
    this.doSubscribe(type, symbol)
  }

  unsubscribeWebSocket(type: WSSubscriptionType, symbol?: string): void {
    const key = this.getSubscriptionKey(type, symbol)
    
    if (this.subscriptions.has(key)) {
      this.removeAllListeners(key)
      this.subscriptions.delete(key)
      this.doUnsubscribe(type, symbol)
    }
  }

  // 子类需要实现的WebSocket方法
  protected abstract doSubscribe(type: WSSubscriptionType, symbol?: string): void
  protected abstract doUnsubscribe(type: WSSubscriptionType, symbol?: string): void

  // 工具方法
  protected getSubscriptionKey(type: WSSubscriptionType, symbol?: string): string {
    return symbol ? `${type}:${symbol}` : type
  }

  protected emitWebSocketData(type: WSSubscriptionType, data: any, symbol?: string): void {
    const key = this.getSubscriptionKey(type, symbol)
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: Date.now()
    }
    
    this.emit(key, message)
    this.emit('message', message)
  }

  // 错误处理
  protected handleError(error: any, context?: string): never {
    const message = context ? `${context}: ${error.message || error}` : (error.message || error)
    throw new ExchangeError(message, error.code, this.exchangeName)
  }

  // 符号标准化 - 统一交易对格式
  protected normalizeSymbol(symbol: string): string {
    // 将 BTC/USDT 格式转换为各交易所特定格式
    return symbol.replace('/', '').toUpperCase()
  }

  // 反向符号标准化
  protected denormalizeSymbol(symbol: string): string {
    // 将交易所格式转换回标准格式 BTC/USDT
    if (symbol.endsWith('USDT') && !symbol.includes('/')) {
      const base = symbol.replace('USDT', '')
      return `${base}/USDT`
    }
    return symbol
  }

  // 数量精度处理
  protected formatAmount(amount: number, precision: number = 8): number {
    return Number(amount.toFixed(precision))
  }

  // 价格精度处理
  protected formatPrice(price: number, precision: number = 6): number {
    return Number(price.toFixed(precision))
  }

  // 时间戳标准化
  protected normalizeTimestamp(timestamp: number | string): number {
    if (typeof timestamp === 'string') {
      return new Date(timestamp).getTime()
    }
    // 如果是秒级时间戳，转换为毫秒
    if (timestamp < 10000000000) {
      return timestamp * 1000
    }
    return timestamp
  }

  // 生成客户端订单ID
  protected generateClientOrderId(prefix: string = 'ttm'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 重连逻辑
  protected async reconnect(maxRetries: number = 5): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (this.credentials) {
          await this.connect(this.credentials)
          break
        }
      } catch (error) {
        console.error(`${this.exchangeName} 重连失败 (${i + 1}/${maxRetries}):`, error)
        if (i === maxRetries - 1) {
          throw error
        }
        // 指数退避
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
      }
    }
  }

  // 心跳检测
  protected startHeartbeat(intervalMs: number = 30000): void {
    setInterval(() => {
      this.emit('heartbeat', { timestamp: Date.now() })
    }, intervalMs)
  }

  // 清理资源
  async cleanup(): Promise<void> {
    try {
      // 取消所有订阅
      for (const key of this.subscriptions.keys()) {
        this.removeAllListeners(key)
      }
      this.subscriptions.clear()
      
      // 断开连接
      if (this.connected) {
        await this.disconnect()
      }
      
      // 移除所有事件监听器
      this.removeAllListeners()
    } catch (error) {
      console.error(`${this.exchangeName} 清理资源时出错:`, error)
    }
  }
}