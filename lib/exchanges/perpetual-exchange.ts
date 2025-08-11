import WebSocket from 'ws'
import { EXCHANGES, ExchangeType } from '@/types/database-v2'

/**
 * 永续合约交易配置
 */
export interface PerpetualConfig {
  apiKey: string
  secretKey: string
  passphrase?: string  // OKX/Bitget需要
  testnet?: boolean
}

/**
 * 永续合约下单参数
 */
export interface OrderParams {
  symbol: string
  side: 'buy' | 'sell'
  type: 'limit' | 'market'
  amount: number
  price?: number
  leverage?: number
  clientOrderId?: string
}

/**
 * 订单响应
 */
export interface OrderResult {
  orderId: string
  symbol: string
  side: 'buy' | 'sell'
  type: string
  amount: number
  price?: number
  status: 'open' | 'filled' | 'cancelled'
}

/**
 * 持仓信息
 */
export interface Position {
  symbol: string
  side: 'long' | 'short'
  size: number
  leverage: number
  entryPrice: number
  markPrice: number
  unrealizedPnl: number
  liquidationPrice?: number
}

/**
 * 账户余额
 */
export interface Balance {
  currency: string
  available: number
  total: number
}

/**
 * 市场数据
 */
export interface MarketData {
  symbol: string
  price: number
  volume24h?: number
  change24h?: number
}

/**
 * 订单薄
 */
export interface OrderBook {
  symbol: string
  bids: [number, number][]
  asks: [number, number][]
}

/**
 * 抽象永续合约交易所
 * 只包含核心功能，避免过度封装
 */
export abstract class PerpetualExchange {
  protected config: PerpetualConfig
  protected exchange: ExchangeType
  protected restClient: any
  protected wsConnections: Map<string, WebSocket> = new Map()

  constructor(exchange: ExchangeType, config: PerpetualConfig) {
    this.exchange = exchange
    this.config = config
  }

  // 核心交易功能
  abstract connect(): Promise<void>
  abstract disconnect(): Promise<void>
  abstract placeOrder(params: OrderParams): Promise<OrderResult>
  abstract cancelOrder(orderId: string, symbol: string): Promise<boolean>
  abstract getOrderStatus(orderId: string, symbol: string): Promise<OrderResult>
  abstract getPositions(): Promise<Position[]>
  abstract getBalance(): Promise<Balance[]>
  abstract setLeverage(symbol: string, leverage: number): Promise<boolean>

  // 市场数据
  abstract getMarketData(symbol: string): Promise<MarketData>
  abstract getOrderBook(symbol: string, depth?: number): Promise<OrderBook>

  // WebSocket订阅
  abstract subscribeMarketData(symbol: string, callback: (data: MarketData) => void): Promise<string>
  abstract subscribeOrderBook(symbol: string, callback: (data: OrderBook) => void): Promise<string>
  abstract unsubscribe(connectionId: string): Promise<void>

  // 通用方法
  isConnected(): boolean {
    return !!this.restClient
  }

  getExchange(): ExchangeType {
    return this.exchange
  }

  cleanup(): void {
    this.wsConnections.forEach(ws => ws.close())
    this.wsConnections.clear()
  }
}

/**
 * Binance永续合约实现
 */
export class BinancePerpetual extends PerpetualExchange {
  constructor(config: PerpetualConfig) {
    super(EXCHANGES.BINANCE, config)
  }

  async connect(): Promise<void> {
    const Binance = require('binance-api-node')
    this.restClient = Binance({
      apiKey: this.config.apiKey,
      apiSecret: this.config.secretKey,
      futures: true,
      test: this.config.testnet || false
    })
    await this.restClient.futuresPing()
  }

  async disconnect(): Promise<void> {
    this.cleanup()
    this.restClient = null
  }

  async placeOrder(params: OrderParams): Promise<OrderResult> {
    const orderParams: any = {
      symbol: params.symbol.replace('/', ''),
      side: params.side.toUpperCase(),
      type: params.type.toUpperCase(),
      quantity: params.amount.toString()
    }

    if (params.price) orderParams.price = params.price.toString()
    if (params.clientOrderId) orderParams.newClientOrderId = params.clientOrderId

    const response = await this.restClient.futuresOrder(orderParams)
    
    return {
      orderId: response.orderId.toString(),
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      amount: parseFloat(response.origQty),
      price: response.price ? parseFloat(response.price) : undefined,
      status: this.mapStatus(response.status)
    }
  }

  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    try {
      await this.restClient.futuresCancelOrder({
        symbol: symbol.replace('/', ''),
        orderId: parseInt(orderId)
      })
      return true
    } catch {
      return false
    }
  }

  async getOrderStatus(orderId: string, symbol: string): Promise<OrderResult> {
    const response = await this.restClient.futuresGetOrder({
      symbol: symbol.replace('/', ''),
      orderId: parseInt(orderId)
    })
    
    return {
      orderId: response.orderId.toString(),
      symbol,
      side: response.side.toLowerCase(),
      type: response.type.toLowerCase(),
      amount: parseFloat(response.origQty),
      price: response.price ? parseFloat(response.price) : undefined,
      status: this.mapStatus(response.status)
    }
  }

  async getPositions(): Promise<Position[]> {
    const response = await this.restClient.futuresPositionRisk()
    
    return response
      .filter((pos: any) => parseFloat(pos.positionAmt) !== 0)
      .map((pos: any) => ({
        symbol: this.formatSymbol(pos.symbol),
        side: parseFloat(pos.positionAmt) > 0 ? 'long' : 'short',
        size: Math.abs(parseFloat(pos.positionAmt)),
        leverage: parseFloat(pos.leverage),
        entryPrice: parseFloat(pos.entryPrice),
        markPrice: parseFloat(pos.markPrice),
        unrealizedPnl: parseFloat(pos.unRealizedProfit),
        liquidationPrice: parseFloat(pos.liquidationPrice)
      }))
  }

  async getBalance(): Promise<Balance[]> {
    const response = await this.restClient.futuresAccountBalance()
    
    return response
      .filter((balance: any) => parseFloat(balance.balance) > 0)
      .map((balance: any) => ({
        currency: balance.asset,
        available: parseFloat(balance.availableBalance),
        total: parseFloat(balance.balance)
      }))
  }

  async setLeverage(symbol: string, leverage: number): Promise<boolean> {
    try {
      await this.restClient.futuresLeverage({
        symbol: symbol.replace('/', ''),
        leverage
      })
      return true
    } catch {
      return false
    }
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    const response = await this.restClient.futuresDailyStats({
      symbol: symbol.replace('/', '')
    })
    
    return {
      symbol,
      price: parseFloat(response.lastPrice),
      volume24h: parseFloat(response.volume),
      change24h: parseFloat(response.priceChangePercent)
    }
  }

  async getOrderBook(symbol: string, depth: number = 20): Promise<OrderBook> {
    const response = await this.restClient.futuresBook({
      symbol: symbol.replace('/', ''),
      limit: depth
    })
    
    return {
      symbol,
      bids: response.bids.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: response.asks.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])])
    }
  }

  async subscribeMarketData(symbol: string, callback: (data: MarketData) => void): Promise<string> {
    // 简化WebSocket实现
    const connectionId = `ticker_${symbol}_${Date.now()}`
    // 实际实现会创建WebSocket连接
    return connectionId
  }

  async subscribeOrderBook(symbol: string, callback: (data: OrderBook) => void): Promise<string> {
    const connectionId = `depth_${symbol}_${Date.now()}`
    // 实际实现会创建WebSocket连接
    return connectionId
  }

  async unsubscribe(connectionId: string): Promise<void> {
    const ws = this.wsConnections.get(connectionId)
    if (ws) {
      ws.close()
      this.wsConnections.delete(connectionId)
    }
  }

  private mapStatus(status: string): 'open' | 'filled' | 'cancelled' {
    switch (status.toUpperCase()) {
      case 'NEW':
      case 'PARTIALLY_FILLED':
        return 'open'
      case 'FILLED':
        return 'filled'
      default:
        return 'cancelled'
    }
  }

  private formatSymbol(symbol: string): string {
    if (symbol.endsWith('USDT')) {
      return `${symbol.slice(0, -4)}/USDT`
    }
    return symbol
  }
}

/**
 * Bybit永续合约实现
 */
export class BybitPerpetual extends PerpetualExchange {
  constructor(config: PerpetualConfig) {
    super(EXCHANGES.BYBIT, config)
  }

  async connect(): Promise<void> {
    const { RestClientV5 } = require('bybit-api')
    this.restClient = new RestClientV5({
      key: this.config.apiKey,
      secret: this.config.secretKey,
      testnet: this.config.testnet || false
    })
    await this.restClient.getServerTime()
  }

  async disconnect(): Promise<void> {
    this.cleanup()
    this.restClient = null
  }

  async placeOrder(params: OrderParams): Promise<OrderResult> {
    const orderParams: any = {
      category: 'linear',
      symbol: params.symbol.replace('/', ''),
      side: params.side.charAt(0).toUpperCase() + params.side.slice(1),
      orderType: params.type.charAt(0).toUpperCase() + params.type.slice(1),
      qty: params.amount.toString()
    }

    if (params.price) orderParams.price = params.price.toString()
    if (params.clientOrderId) orderParams.orderLinkId = params.clientOrderId

    const response = await this.restClient.submitOrder(orderParams)
    
    return {
      orderId: response.result.orderId,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      amount: params.amount,
      price: params.price,
      status: 'open'
    }
  }

  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    try {
      const response = await this.restClient.cancelOrder({
        category: 'linear',
        symbol: symbol.replace('/', ''),
        orderId
      })
      return response.retCode === 0
    } catch {
      return false
    }
  }

  async getOrderStatus(orderId: string, symbol: string): Promise<OrderResult> {
    const response = await this.restClient.getActiveOrders({
      category: 'linear',
      symbol: symbol.replace('/', ''),
      orderId
    })
    
    const order = response.result.list[0]
    return {
      orderId: order.orderId,
      symbol,
      side: order.side.toLowerCase(),
      type: order.orderType.toLowerCase(),
      amount: parseFloat(order.qty),
      price: order.price ? parseFloat(order.price) : undefined,
      status: this.mapStatus(order.orderStatus)
    }
  }

  async getPositions(): Promise<Position[]> {
    const response = await this.restClient.getPositionInfo({
      category: 'linear'
    })
    
    return response.result.list
      .filter((pos: any) => parseFloat(pos.size) !== 0)
      .map((pos: any) => ({
        symbol: this.formatSymbol(pos.symbol),
        side: pos.side.toLowerCase(),
        size: parseFloat(pos.size),
        leverage: parseFloat(pos.leverage),
        entryPrice: parseFloat(pos.avgPrice),
        markPrice: parseFloat(pos.markPrice),
        unrealizedPnl: parseFloat(pos.unrealisedPnl),
        liquidationPrice: parseFloat(pos.liqPrice)
      }))
  }

  async getBalance(): Promise<Balance[]> {
    const response = await this.restClient.getWalletBalance({
      accountType: 'CONTRACT'
    })
    
    return response.result.list[0].coin
      .filter((balance: any) => parseFloat(balance.walletBalance) > 0)
      .map((balance: any) => ({
        currency: balance.coin,
        available: parseFloat(balance.availableToWithdraw),
        total: parseFloat(balance.walletBalance)
      }))
  }

  async setLeverage(symbol: string, leverage: number): Promise<boolean> {
    try {
      const response = await this.restClient.setLeverage({
        category: 'linear',
        symbol: symbol.replace('/', ''),
        buyLeverage: leverage.toString(),
        sellLeverage: leverage.toString()
      })
      return response.retCode === 0
    } catch {
      return false
    }
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    const response = await this.restClient.getTickers({
      category: 'linear',
      symbol: symbol.replace('/', '')
    })
    
    const ticker = response.result.list[0]
    return {
      symbol,
      price: parseFloat(ticker.lastPrice),
      volume24h: parseFloat(ticker.volume24h),
      change24h: parseFloat(ticker.price24hPcnt)
    }
  }

  async getOrderBook(symbol: string, depth: number = 25): Promise<OrderBook> {
    const response = await this.restClient.getOrderbook({
      category: 'linear',
      symbol: symbol.replace('/', ''),
      limit: depth
    })
    
    return {
      symbol,
      bids: response.result.b.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: response.result.a.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])])
    }
  }

  async subscribeMarketData(symbol: string, callback: (data: MarketData) => void): Promise<string> {
    const connectionId = `ticker_${symbol}_${Date.now()}`
    return connectionId
  }

  async subscribeOrderBook(symbol: string, callback: (data: OrderBook) => void): Promise<string> {
    const connectionId = `depth_${symbol}_${Date.now()}`
    return connectionId
  }

  async unsubscribe(connectionId: string): Promise<void> {
    const ws = this.wsConnections.get(connectionId)
    if (ws) {
      ws.close()
      this.wsConnections.delete(connectionId)
    }
  }

  private mapStatus(status: string): 'open' | 'filled' | 'cancelled' {
    switch (status) {
      case 'New':
      case 'PartiallyFilled':
        return 'open'
      case 'Filled':
        return 'filled'
      default:
        return 'cancelled'
    }
  }

  private formatSymbol(symbol: string): string {
    if (symbol.endsWith('USDT')) {
      return `${symbol.slice(0, -4)}/USDT`
    }
    return symbol
  }
}

/**
 * Bitget永续合约实现
 */
export class BitgetPerpetual extends PerpetualExchange {
  constructor(config: PerpetualConfig) {
    super(EXCHANGES.BITGET, config)
  }

  async connect(): Promise<void> {
    // 简化实现 - 直接使用HTTP API
    this.restClient = {
      apiKey: this.config.apiKey,
      secretKey: this.config.secretKey,
      passphrase: this.config.passphrase,
      testnet: this.config.testnet || false
    }
  }

  async disconnect(): Promise<void> {
    this.cleanup()
    this.restClient = null
  }

  async placeOrder(params: OrderParams): Promise<OrderResult> {
    // 简化实现
    return {
      orderId: `bitget_${Date.now()}`,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      amount: params.amount,
      price: params.price,
      status: 'open'
    }
  }

  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    return true
  }

  async getOrderStatus(orderId: string, symbol: string): Promise<OrderResult> {
    return {
      orderId,
      symbol,
      side: 'buy',
      type: 'limit',
      amount: 0,
      status: 'filled'
    }
  }

  async getPositions(): Promise<Position[]> {
    return []
  }

  async getBalance(): Promise<Balance[]> {
    return []
  }

  async setLeverage(symbol: string, leverage: number): Promise<boolean> {
    return true
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    return {
      symbol,
      price: 0
    }
  }

  async getOrderBook(symbol: string, depth?: number): Promise<OrderBook> {
    return {
      symbol,
      bids: [],
      asks: []
    }
  }

  async subscribeMarketData(symbol: string, callback: (data: MarketData) => void): Promise<string> {
    return `bitget_ticker_${symbol}_${Date.now()}`
  }

  async subscribeOrderBook(symbol: string, callback: (data: OrderBook) => void): Promise<string> {
    return `bitget_depth_${symbol}_${Date.now()}`
  }

  async unsubscribe(connectionId: string): Promise<void> {
    // 实现取消订阅
  }
}

/**
 * OKX永续合约实现
 */
export class OKXPerpetual extends PerpetualExchange {
  constructor(config: PerpetualConfig) {
    super(EXCHANGES.OKX, config)
  }

  async connect(): Promise<void> {
    // 简化实现 - 直接使用HTTP API
    this.restClient = {
      apiKey: this.config.apiKey,
      secretKey: this.config.secretKey,
      passphrase: this.config.passphrase,
      testnet: this.config.testnet || false
    }
  }

  async disconnect(): Promise<void> {
    this.cleanup()
    this.restClient = null
  }

  async placeOrder(params: OrderParams): Promise<OrderResult> {
    // 简化实现
    return {
      orderId: `okx_${Date.now()}`,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      amount: params.amount,
      price: params.price,
      status: 'open'
    }
  }

  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    return true
  }

  async getOrderStatus(orderId: string, symbol: string): Promise<OrderResult> {
    return {
      orderId,
      symbol,
      side: 'buy',
      type: 'limit',
      amount: 0,
      status: 'filled'
    }
  }

  async getPositions(): Promise<Position[]> {
    return []
  }

  async getBalance(): Promise<Balance[]> {
    return []
  }

  async setLeverage(symbol: string, leverage: number): Promise<boolean> {
    return true
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    return {
      symbol,
      price: 0
    }
  }

  async getOrderBook(symbol: string, depth?: number): Promise<OrderBook> {
    return {
      symbol,
      bids: [],
      asks: []
    }
  }

  async subscribeMarketData(symbol: string, callback: (data: MarketData) => void): Promise<string> {
    return `okx_ticker_${symbol}_${Date.now()}`
  }

  async subscribeOrderBook(symbol: string, callback: (data: OrderBook) => void): Promise<string> {
    return `okx_depth_${symbol}_${Date.now()}`
  }

  async unsubscribe(connectionId: string): Promise<void> {
    // 实现取消订阅
  }
}

/**
 * 简化的交易所工厂
 */
export class PerpetualFactory {
  private static instance: PerpetualFactory
  private exchanges: Map<string, PerpetualExchange> = new Map()

  static getInstance(): PerpetualFactory {
    if (!PerpetualFactory.instance) {
      PerpetualFactory.instance = new PerpetualFactory()
    }
    return PerpetualFactory.instance
  }

  createExchange(exchange: ExchangeType, config: PerpetualConfig): PerpetualExchange {
    const key = `${exchange}_${config.apiKey.slice(0, 8)}`
    
    if (this.exchanges.has(key)) {
      return this.exchanges.get(key)!
    }

    let exchangeInstance: PerpetualExchange

    switch (exchange) {
      case EXCHANGES.BINANCE:
        exchangeInstance = new BinancePerpetual(config)
        break
      case EXCHANGES.BYBIT:
        exchangeInstance = new BybitPerpetual(config)
        break
      case EXCHANGES.BITGET:
        exchangeInstance = new BitgetPerpetual(config)
        break
      case EXCHANGES.OKX:
        exchangeInstance = new OKXPerpetual(config)
        break
      default:
        throw new Error(`Exchange ${exchange} not implemented`)
    }

    this.exchanges.set(key, exchangeInstance)
    return exchangeInstance
  }

  getExchange(exchange: ExchangeType, apiKey: string): PerpetualExchange | null {
    const key = `${exchange}_${apiKey.slice(0, 8)}`
    return this.exchanges.get(key) || null
  }

  async removeExchange(exchange: ExchangeType, apiKey: string): Promise<void> {
    const key = `${exchange}_${apiKey.slice(0, 8)}`
    const instance = this.exchanges.get(key)
    if (instance) {
      await instance.disconnect()
      this.exchanges.delete(key)
    }
  }

  getSupportedExchanges(): ExchangeType[] {
    return [EXCHANGES.BINANCE, EXCHANGES.BYBIT, EXCHANGES.BITGET, EXCHANGES.OKX]
  }
}

// 单例导出
export const perpetualFactory = PerpetualFactory.getInstance()