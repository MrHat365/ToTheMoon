import EventEmitter from 'events'
import { ExchangeFactory, SupportedExchange } from './exchange-factory'
import { 
  FuturesExchangeInterface, 
  ExchangeCredentials, 
  WSSubscriptionType, 
  WebSocketMessage,
  FuturesAccountInfo,
  FuturesPosition,
  FuturesTicker,
  FuturesOrder,
  OrderRequest
} from './types'

interface ExchangeConnection {
  exchange: FuturesExchangeInterface
  credentials: ExchangeCredentials
  connected: boolean
  lastHeartbeat?: number
  reconnectAttempts: number
  subscriptions: Set<string>
}

interface ExchangeHealthStatus {
  name: string
  connected: boolean
  wsConnected: boolean
  lastHeartbeat?: number
  reconnectAttempts: number
  subscriptionCount: number
  error?: string
}

export class ExchangeManager extends EventEmitter {
  private static instance: ExchangeManager
  private connections: Map<string, ExchangeConnection> = new Map()
  private factory: ExchangeFactory
  private healthCheckInterval?: NodeJS.Timeout
  private readonly HEALTH_CHECK_INTERVAL = 30000 // 30秒
  private readonly MAX_RECONNECT_ATTEMPTS = 5
  private readonly RECONNECT_DELAY = 2000 // 2秒

  private constructor() {
    super()
    this.factory = ExchangeFactory.getInstance()
    this.setMaxListeners(100)
    this.startHealthCheck()
  }

  static getInstance(): ExchangeManager {
    if (!ExchangeManager.instance) {
      ExchangeManager.instance = new ExchangeManager()
    }
    return ExchangeManager.instance
  }

  /**
   * 添加并连接交易所
   */
  async addExchange(
    exchangeName: string, 
    credentials: ExchangeCredentials,
    autoConnect: boolean = true
  ): Promise<FuturesExchangeInterface> {
    const normalizedName = exchangeName.toLowerCase()

    // 验证配置
    if (!this.factory.validateExchangeConfig(exchangeName, credentials)) {
      throw new Error(`交易所 ${exchangeName} 配置验证失败`)
    }

    // 创建交易所实例
    const exchange = this.factory.createExchange(exchangeName)
    
    // 设置事件监听器
    this.setupExchangeEventListeners(exchange, normalizedName)

    // 保存连接信息
    const connection: ExchangeConnection = {
      exchange,
      credentials,
      connected: false,
      reconnectAttempts: 0,
      subscriptions: new Set()
    }
    
    this.connections.set(normalizedName, connection)

    // 自动连接
    if (autoConnect) {
      await this.connectExchange(normalizedName)
    }

    this.emit('exchangeAdded', { name: normalizedName, exchange })
    return exchange
  }

  /**
   * 移除交易所连接
   */
  async removeExchange(exchangeName: string): Promise<void> {
    const normalizedName = exchangeName.toLowerCase()
    const connection = this.connections.get(normalizedName)
    
    if (!connection) {
      throw new Error(`交易所 ${exchangeName} 未找到`)
    }

    // 断开连接并清理
    if (connection.connected) {
      await connection.exchange.disconnect()
    }
    
    await connection.exchange.cleanup()
    this.connections.delete(normalizedName)

    this.emit('exchangeRemoved', { name: normalizedName })
  }

  /**
   * 连接指定交易所
   */
  async connectExchange(exchangeName: string): Promise<void> {
    const normalizedName = exchangeName.toLowerCase()
    const connection = this.connections.get(normalizedName)
    
    if (!connection) {
      throw new Error(`交易所 ${exchangeName} 未找到`)
    }

    if (connection.connected) {
      console.log(`交易所 ${exchangeName} 已经连接`)
      return
    }

    try {
      await connection.exchange.connect(connection.credentials)
      connection.connected = true
      connection.reconnectAttempts = 0
      connection.lastHeartbeat = Date.now()
      
      this.emit('exchangeConnected', { name: normalizedName })
    } catch (error) {
      connection.connected = false
      this.emit('exchangeError', { name: normalizedName, error })
      throw error
    }
  }

  /**
   * 断开指定交易所
   */
  async disconnectExchange(exchangeName: string): Promise<void> {
    const normalizedName = exchangeName.toLowerCase()
    const connection = this.connections.get(normalizedName)
    
    if (!connection) {
      throw new Error(`交易所 ${exchangeName} 未找到`)
    }

    if (!connection.connected) {
      console.log(`交易所 ${exchangeName} 已经断开`)
      return
    }

    try {
      await connection.exchange.disconnect()
      connection.connected = false
      
      this.emit('exchangeDisconnected', { name: normalizedName })
    } catch (error) {
      this.emit('exchangeError', { name: normalizedName, error })
      throw error
    }
  }

  /**
   * 连接所有交易所
   */
  async connectAll(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(name => 
      this.connectExchange(name).catch(error => 
        console.error(`连接交易所 ${name} 失败:`, error)
      )
    )
    
    await Promise.all(promises)
  }

  /**
   * 断开所有交易所
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(name => 
      this.disconnectExchange(name).catch(error => 
        console.error(`断开交易所 ${name} 失败:`, error)
      )
    )
    
    await Promise.all(promises)
  }

  /**
   * 获取交易所实例
   */
  getExchange(exchangeName: string): FuturesExchangeInterface | null {
    const normalizedName = exchangeName.toLowerCase()
    const connection = this.connections.get(normalizedName)
    return connection ? connection.exchange : null
  }

  /**
   * 获取已连接的交易所列表
   */
  getConnectedExchanges(): string[] {
    return Array.from(this.connections.entries())
      .filter(([_, connection]) => connection.connected)
      .map(([name]) => name)
  }

  /**
   * 获取所有交易所状态
   */
  getAllExchangeStatuses(): ExchangeHealthStatus[] {
    return Array.from(this.connections.entries()).map(([name, connection]) => ({
      name,
      connected: connection.connected,
      wsConnected: connection.exchange.isWebSocketConnected(),
      lastHeartbeat: connection.lastHeartbeat,
      reconnectAttempts: connection.reconnectAttempts,
      subscriptionCount: connection.subscriptions.size
    }))
  }

  /**
   * 批量获取账户信息
   */
  async getAllAccountsInfo(): Promise<Map<string, FuturesAccountInfo>> {
    const results = new Map<string, FuturesAccountInfo>()
    
    for (const [name, connection] of this.connections.entries()) {
      if (connection.connected) {
        try {
          const accountInfo = await connection.exchange.getFuturesAccount()
          results.set(name, accountInfo)
        } catch (error) {
          console.error(`获取 ${name} 账户信息失败:`, error)
        }
      }
    }
    
    return results
  }

  /**
   * 批量获取持仓信息
   */
  async getAllPositions(symbol?: string): Promise<Map<string, FuturesPosition[]>> {
    const results = new Map<string, FuturesPosition[]>()
    
    for (const [name, connection] of this.connections.entries()) {
      if (connection.connected) {
        try {
          const positions = await connection.exchange.getFuturesPositions(symbol)
          results.set(name, positions)
        } catch (error) {
          console.error(`获取 ${name} 持仓信息失败:`, error)
        }
      }
    }
    
    return results
  }

  /**
   * 批量获取行情数据
   */
  async getAllTickers(symbol: string): Promise<Map<string, FuturesTicker>> {
    const results = new Map<string, FuturesTicker>()
    
    for (const [name, connection] of this.connections.entries()) {
      if (connection.connected) {
        try {
          const ticker = await connection.exchange.getFuturesTicker(symbol)
          results.set(name, ticker)
        } catch (error) {
          console.error(`获取 ${name} 行情数据失败:`, error)
        }
      }
    }
    
    return results
  }

  /**
   * 在指定交易所下单
   */
  async createOrder(exchangeName: string, orderParams: OrderRequest): Promise<FuturesOrder> {
    const exchange = this.getExchange(exchangeName)
    if (!exchange) {
      throw new Error(`交易所 ${exchangeName} 未找到或未连接`)
    }
    
    const connection = this.connections.get(exchangeName.toLowerCase())
    if (!connection?.connected) {
      throw new Error(`交易所 ${exchangeName} 未连接`)
    }
    
    return await exchange.createFuturesOrder(orderParams)
  }

  /**
   * 统一WebSocket订阅管理
   */
  subscribeToAllExchanges(
    type: WSSubscriptionType, 
    symbol?: string, 
    callback?: (exchangeName: string, data: WebSocketMessage) => void
  ): void {
    for (const [name, connection] of this.connections.entries()) {
      if (connection.connected) {
        const subscriptionKey = `${type}:${symbol || 'all'}`
        connection.subscriptions.add(subscriptionKey)
        
        connection.exchange.subscribeWebSocket(type, symbol, (data) => {
          if (callback) {
            callback(name, data)
          }
          this.emit('websocketData', { exchange: name, type, symbol, data })
        })
      }
    }
  }

  /**
   * 设置交易所事件监听器
   */
  private setupExchangeEventListeners(exchange: FuturesExchangeInterface, name: string): void {
    exchange.on('connected', () => {
      const connection = this.connections.get(name)
      if (connection) {
        connection.connected = true
        connection.lastHeartbeat = Date.now()
      }
      this.emit('exchangeConnected', { name })
    })

    exchange.on('disconnected', () => {
      const connection = this.connections.get(name)
      if (connection) {
        connection.connected = false
      }
      this.emit('exchangeDisconnected', { name })
    })

    exchange.on('wsConnected', () => {
      this.emit('exchangeWebSocketConnected', { name })
    })

    exchange.on('wsDisconnected', () => {
      this.emit('exchangeWebSocketDisconnected', { name })
    })

    exchange.on('wsError', (error) => {
      this.emit('exchangeWebSocketError', { name, error })
    })

    exchange.on('error', (error) => {
      this.emit('exchangeError', { name, error })
    })

    exchange.on('heartbeat', () => {
      const connection = this.connections.get(name)
      if (connection) {
        connection.lastHeartbeat = Date.now()
      }
    })
  }

  /**
   * 健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, this.HEALTH_CHECK_INTERVAL)
  }

  private async performHealthCheck(): Promise<void> {
    const now = Date.now()
    
    for (const [name, connection] of this.connections.entries()) {
      if (!connection.connected) continue
      
      // 检查心跳超时
      if (connection.lastHeartbeat && 
          now - connection.lastHeartbeat > this.HEALTH_CHECK_INTERVAL * 2) {
        console.warn(`交易所 ${name} 心跳超时，尝试重连`)
        await this.attemptReconnect(name)
      }
      
      // 检查连接状态
      if (!connection.exchange.isConnected()) {
        console.warn(`交易所 ${name} 连接已断开，尝试重连`)
        await this.attemptReconnect(name)
      }
    }
  }

  private async attemptReconnect(exchangeName: string): Promise<void> {
    const connection = this.connections.get(exchangeName)
    if (!connection) return
    
    if (connection.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error(`交易所 ${exchangeName} 重连次数已达上限，停止重连`)
      return
    }
    
    connection.reconnectAttempts++
    
    try {
      console.log(`尝试重连交易所 ${exchangeName} (${connection.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`)
      
      // 等待重连延迟
      await new Promise(resolve => setTimeout(resolve, this.RECONNECT_DELAY * connection.reconnectAttempts))
      
      await connection.exchange.connect(connection.credentials)
      connection.connected = true
      connection.reconnectAttempts = 0
      connection.lastHeartbeat = Date.now()
      
      console.log(`交易所 ${exchangeName} 重连成功`)
      this.emit('exchangeReconnected', { name: exchangeName })
      
    } catch (error) {
      console.error(`交易所 ${exchangeName} 重连失败:`, error)
      this.emit('exchangeReconnectFailed', { name: exchangeName, error, attempts: connection.reconnectAttempts })
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    await this.disconnectAll()
    
    for (const connection of this.connections.values()) {
      await connection.exchange.cleanup()
    }
    
    this.connections.clear()
    this.removeAllListeners()
  }
}

// 导出单例实例
export const exchangeManager = ExchangeManager.getInstance()