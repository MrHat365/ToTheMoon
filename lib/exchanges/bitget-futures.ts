import { RestClientV2, WebsocketClientV2 } from 'bitget-api'
import { BaseFuturesExchange } from './base-exchange'
import {
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
  NetworkError,
  AuthenticationError,
  InsufficientFunds,
  InvalidOrder,
  OrderNotFound
} from './types'

export class BitgetFuturesExchange extends BaseFuturesExchange {
  private client?: RestClientV2
  private wsClient?: WebsocketClientV2
  private wsStreams: Set<string> = new Set()

  constructor() {
    super('Bitget')
  }

  async connect(credentials: ExchangeCredentials): Promise<void> {
    try {
      this.credentials = credentials
      
      this.client = new RestClientV2({
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        apiPass: credentials.passphrase || '',
        baseUrl: credentials.sandbox ? 'https://api.bitget.com' : undefined // Bitget uses same URL
      })

      // 测试连接
      await this.client.getServerTime()
      
      // 初始化WebSocket客户端
      this.wsClient = new WebsocketClientV2({
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        apiPass: credentials.passphrase || '',
        sandBox: credentials.sandbox || false
      })

      this.setupWebSocketHandlers()
      
      this.connected = true
      this.emit('connected')
      
      console.log('Bitget 连接成功')
    } catch (error) {
      this.handleConnectionError(error)
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.wsClient) {
        this.wsClient.closeAll()
      }
      
      this.connected = false
      this.wsConnected = false
      this.wsStreams.clear()
      
      this.emit('disconnected')
      console.log('Bitget 连接已断开')
    } catch (error) {
      console.error('Bitget 断开连接时出错:', error)
    }
  }

  async getFuturesAccount(): Promise<FuturesAccountInfo> {
    if (!this.client) throw new Error('未连接到Bitget')
    
    try {
      const response = await this.client.getFuturesAccount({ productType: 'USDT-FUTURES' })
      const account = response.data
      
      return {
        accountId: 'bitget_futures',
        name: 'Bitget Futures Account',
        balance: parseFloat(account.usdtEquity),
        availableBalance: parseFloat(account.availableBalance),
        unrealizedPnl: parseFloat(account.unrealizedPL),
        marginRatio: parseFloat(account.marginRatio),
        totalWalletBalance: parseFloat(account.usdtEquity),
        totalUnrealizedPnL: parseFloat(account.unrealizedPL),
        totalMarginBalance: parseFloat(account.marginBalance),
        totalMaintMargin: parseFloat(account.maintainMargin),
        totalInitialMargin: parseFloat(account.frozenBalance),
        maxWithdrawAmount: parseFloat(account.availableBalance)
      }
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesBalances(): Promise<FuturesBalance[]> {
    if (!this.client) throw new Error('未连接到Bitget')
    
    try {
      const response = await this.client.getFuturesAccount({ productType: 'USDT-FUTURES' })
      const account = response.data
      
      return [{
        currency: 'USDT',
        free: parseFloat(account.availableBalance),
        used: parseFloat(account.frozenBalance),
        total: parseFloat(account.usdtEquity)
      }]
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesPositions(symbol?: string): Promise<FuturesPosition[]> {
    if (!this.client) throw new Error('未连接到Bitget')
    
    try {
      const params: any = { productType: 'USDT-FUTURES' }
      if (symbol) {
        params.symbol = this.normalizeSymbol(symbol)
      }
      
      const response = await this.client.getFuturesPositions(params)
      
      return response.data
        .filter((pos: any) => parseFloat(pos.total) > 0)
        .map((pos: any) => ({
          symbol: this.denormalizeSymbol(pos.symbol),
          side: pos.holdSide === 'long' ? 'long' : 'short',
          size: parseFloat(pos.total),
          notional: parseFloat(pos.marketValue),
          entryPrice: parseFloat(pos.averageOpenPrice),
          markPrice: parseFloat(pos.markPrice),
          unrealizedPnl: parseFloat(pos.unrealizedPL),
          percentage: parseFloat(pos.unrealizedPL) / parseFloat(pos.marketValue) * 100,
          leverage: parseFloat(pos.leverage),
          marginType: pos.marginMode === 'crossed' ? 'cross' : 'isolated',
          liquidationPrice: parseFloat(pos.liquidationPrice),
          timestamp: Date.now()
        }))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesTicker(symbol: string): Promise<FuturesTicker> {
    if (!this.client) throw new Error('未连接到Bitget')
    
    try {
      const bitgetSymbol = this.normalizeSymbol(symbol)
      const response = await this.client.getFuturesTicker({ symbol: bitgetSymbol })
      const ticker = response.data
      
      return {
        symbol: this.denormalizeSymbol(ticker.symbol),
        high: parseFloat(ticker.high24h),
        low: parseFloat(ticker.low24h),
        bid: parseFloat(ticker.bestBid),
        bidVolume: parseFloat(ticker.bidSz),
        ask: parseFloat(ticker.bestAsk),
        askVolume: parseFloat(ticker.askSz),
        open: parseFloat(ticker.open),
        close: parseFloat(ticker.lastPr),
        last: parseFloat(ticker.lastPr),
        change: parseFloat(ticker.change24h),
        percentage: parseFloat(ticker.changeUtc) * 100,
        baseVolume: parseFloat(ticker.baseVolume),
        quoteVolume: parseFloat(ticker.usdtVolume),
        timestamp: parseInt(ticker.ts),
        datetime: new Date(parseInt(ticker.ts)).toISOString()
      }
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesOrderBook(symbol: string, limit: number = 20): Promise<FuturesOrderBook> {
    if (!this.client) throw new Error('未连接到Bitget')
    
    try {
      const bitgetSymbol = this.normalizeSymbol(symbol)
      const response = await this.client.getFuturesOrderBook({ 
        symbol: bitgetSymbol, 
        limit: limit.toString() 
      })
      const orderbook = response.data
      
      return {
        symbol: this.denormalizeSymbol(bitgetSymbol),
        bids: orderbook.bids.map((bid: any) => [parseFloat(bid[0]), parseFloat(bid[1])]),
        asks: orderbook.asks.map((ask: any) => [parseFloat(ask[0]), parseFloat(ask[1])]),
        timestamp: parseInt(orderbook.ts),
        datetime: new Date(parseInt(orderbook.ts)).toISOString()
      }
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesTrades(symbol: string, limit: number = 100): Promise<FuturesTrade[]> {
    if (!this.client) throw new Error('未连接到Bitget')
    
    try {
      const bitgetSymbol = this.normalizeSymbol(symbol)
      const response = await this.client.getFuturesRecentTrades({ 
        symbol: bitgetSymbol, 
        limit: limit.toString() 
      })
      
      return response.data.map((trade: any) => ({
        id: trade.tradeId,
        timestamp: parseInt(trade.ts),
        datetime: new Date(parseInt(trade.ts)).toISOString(),
        symbol: this.denormalizeSymbol(bitgetSymbol),
        side: trade.side.toLowerCase() as 'buy' | 'sell',
        amount: parseFloat(trade.size),
        price: parseFloat(trade.price),
        cost: parseFloat(trade.size) * parseFloat(trade.price)
      }))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async createFuturesOrder(params: OrderRequest): Promise<FuturesOrder> {
    if (!this.client) throw new Error('未连接到Bitget')
    
    try {
      const bitgetSymbol = this.normalizeSymbol(params.symbol)
      const clientOrderId = this.generateClientOrderId('bitget')
      
      const orderParams: any = {
        symbol: bitgetSymbol,
        productType: 'USDT-FUTURES',
        marginMode: 'crossed',
        side: params.side,
        orderType: params.type === 'market' ? 'market' : 'limit',
        size: this.formatAmount(params.amount).toString(),
        clientOid: clientOrderId
      }

      if (params.type === 'limit') {
        orderParams.price = this.formatPrice(params.price!).toString()
        orderParams.timeInForce = params.timeInForce || 'GTC'
      }

      if (params.reduceOnly) {
        orderParams.reduceOnly = 'YES'
      }

      const response = await this.client.submitFuturesOrder(orderParams)
      
      // 获取完整订单信息
      const orderInfo = await this.getFuturesOrder(response.data.orderId, params.symbol)
      return orderInfo
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async cancelFuturesOrder(orderId: string, symbol: string): Promise<FuturesOrder> {
    if (!this.client) throw new Error('未连接到Bitget')
    
    try {
      const bitgetSymbol = this.normalizeSymbol(symbol)
      await this.client.cancelFuturesOrder({
        symbol: bitgetSymbol,
        productType: 'USDT-FUTURES',
        orderId
      })
      
      // 获取取消后的订单信息
      return await this.getFuturesOrder(orderId, symbol)
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesOrder(orderId: string, symbol: string): Promise<FuturesOrder> {
    if (!this.client) throw new Error('未连接到Bitget')
    
    try {
      const bitgetSymbol = this.normalizeSymbol(symbol)
      const response = await this.client.getFuturesOrder({
        symbol: bitgetSymbol,
        productType: 'USDT-FUTURES',
        orderId
      })
      
      return this.formatOrder(response.data)
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesOrders(symbol?: string, limit: number = 100): Promise<FuturesOrder[]> {
    if (!this.client) throw new Error('未连接到Bitget')
    
    try {
      const params: any = { 
        productType: 'USDT-FUTURES',
        pageSize: limit.toString()
      }
      if (symbol) {
        params.symbol = this.normalizeSymbol(symbol)
      }
      
      const response = await this.client.getFuturesOrderHistory(params)
      
      return response.data.orderList.map((order: any) => this.formatOrder(order))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesOpenOrders(symbol?: string): Promise<FuturesOrder[]> {
    if (!this.client) throw new Error('未连接到Bitget')
    
    try {
      const params: any = { productType: 'USDT-FUTURES' }
      if (symbol) {
        params.symbol = this.normalizeSymbol(symbol)
      }
      
      const response = await this.client.getFuturesOpenOrders(params)
      
      return response.data.map((order: any) => this.formatOrder(order))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async setLeverage(symbol: string, leverage: number): Promise<any> {
    if (!this.client) throw new Error('未连接到Bitget')
    
    try {
      const bitgetSymbol = this.normalizeSymbol(symbol)
      return await this.client.setFuturesLeverage({
        symbol: bitgetSymbol,
        productType: 'USDT-FUTURES',
        leverage: leverage.toString()
      })
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async setMarginType(symbol: string, marginType: 'isolated' | 'cross'): Promise<any> {
    if (!this.client) throw new Error('未连接到Bitget')
    
    try {
      const bitgetSymbol = this.normalizeSymbol(symbol)
      return await this.client.setFuturesMarginMode({
        symbol: bitgetSymbol,
        productType: 'USDT-FUTURES',
        marginMode: marginType === 'cross' ? 'crossed' : 'isolated'
      })
    } catch (error) {
      this.handleApiError(error)
    }
  }

  // WebSocket 实现
  protected doSubscribe(type: WSSubscriptionType, symbol?: string): void {
    if (!this.wsClient) return

    let channel = ''
    let instType = 'USDT-FUTURES'
    
    switch (type) {
      case WSSubscriptionType.TICKER:
        channel = 'ticker'
        break
      case WSSubscriptionType.ORDERBOOK:
        channel = 'books'
        break
      case WSSubscriptionType.KLINE:
        channel = 'candle1m'
        break
      case WSSubscriptionType.TRADE:
        channel = 'trade'
        break
      case WSSubscriptionType.ACCOUNT:
        channel = 'account'
        instType = 'FUTURES'
        break
      case WSSubscriptionType.ORDER:
        channel = 'orders'
        instType = 'FUTURES'
        break
      case WSSubscriptionType.POSITION:
        channel = 'positions'
        instType = 'FUTURES'
        break
    }

    if (channel) {
      const subscribeId = symbol ? `${channel}:${this.normalizeSymbol(symbol)}` : channel
      
      if (!this.wsStreams.has(subscribeId)) {
        const args = symbol ? [{
          instType,
          channel,
          instId: this.normalizeSymbol(symbol)
        }] : [{
          instType,
          channel
        }]

        this.wsClient?.subscribe(args)
        this.wsStreams.add(subscribeId)
      }
    }
  }

  protected doUnsubscribe(type: WSSubscriptionType, symbol?: string): void {
    if (!this.wsClient) return

    let channel = ''
    let instType = 'USDT-FUTURES'
    
    switch (type) {
      case WSSubscriptionType.TICKER:
        channel = 'ticker'
        break
      case WSSubscriptionType.ORDERBOOK:
        channel = 'books'
        break
      case WSSubscriptionType.KLINE:
        channel = 'candle1m'
        break
      case WSSubscriptionType.TRADE:
        channel = 'trade'
        break
      case WSSubscriptionType.ACCOUNT:
        channel = 'account'
        instType = 'FUTURES'
        break
      case WSSubscriptionType.ORDER:
        channel = 'orders'
        instType = 'FUTURES'
        break
      case WSSubscriptionType.POSITION:
        channel = 'positions'
        instType = 'FUTURES'
        break
    }

    if (channel) {
      const subscribeId = symbol ? `${channel}:${this.normalizeSymbol(symbol)}` : channel
      
      if (this.wsStreams.has(subscribeId)) {
        const args = symbol ? [{
          instType,
          channel,
          instId: this.normalizeSymbol(symbol)
        }] : [{
          instType,
          channel
        }]

        this.wsClient?.unsubscribe(args)
        this.wsStreams.delete(subscribeId)
      }
    }
  }

  // 私有方法
  private setupWebSocketHandlers(): void {
    if (!this.wsClient) return

    this.wsClient.on('open', () => {
      this.wsConnected = true
      this.emit('wsConnected')
    })

    this.wsClient.on('close', () => {
      this.wsConnected = false
      this.emit('wsDisconnected')
    })

    this.wsClient.on('error', (error) => {
      this.emit('wsError', error)
    })

    this.wsClient.on('update', (data) => {
      this.handleWebSocketMessage(data)
    })
  }

  private handleWebSocketMessage(data: any): void {
    try {
      if (!data.arg || !data.data) return

      const { channel, instId } = data.arg
      
      switch (channel) {
        case 'ticker':
          this.emitWebSocketData(WSSubscriptionType.TICKER, this.formatTickerMessage(data.data[0]), instId)
          break
        case 'books':
          this.emitWebSocketData(WSSubscriptionType.ORDERBOOK, this.formatOrderBookMessage(data.data[0]), instId)
          break
        case 'candle1m':
          this.emitWebSocketData(WSSubscriptionType.KLINE, this.formatKlineMessage(data.data[0]), instId)
          break
        case 'trade':
          this.emitWebSocketData(WSSubscriptionType.TRADE, this.formatTradeMessages(data.data), instId)
          break
        case 'account':
          this.emitWebSocketData(WSSubscriptionType.ACCOUNT, data.data)
          break
        case 'orders':
          this.emitWebSocketData(WSSubscriptionType.ORDER, data.data.map((order: any) => this.formatOrder(order)))
          break
        case 'positions':
          this.emitWebSocketData(WSSubscriptionType.POSITION, data.data)
          break
      }
    } catch (error) {
      console.error('处理WebSocket消息时出错:', error)
    }
  }

  private formatOrder(order: any): FuturesOrder {
    return {
      orderId: order.orderId,
      clientOrderId: order.clientOid,
      symbol: this.denormalizeSymbol(order.symbol),
      side: order.side,
      type: order.orderType === 'market' ? 'market' : 'limit',
      amount: parseFloat(order.size),
      price: order.price ? parseFloat(order.price) : undefined,
      status: this.mapOrderStatus(order.state),
      timeInForce: order.timeInForce,
      filled: parseFloat(order.fillSize || '0'),
      remaining: parseFloat(order.size) - parseFloat(order.fillSize || '0'),
      cost: parseFloat(order.fillNotionalUsd || '0'),
      average: order.priceAvg ? parseFloat(order.priceAvg) : undefined,
      fee: parseFloat(order.fee || '0'),
      feeCurrency: order.feeCcy || 'USDT',
      timestamp: parseInt(order.cTime),
      datetime: new Date(parseInt(order.cTime)).toISOString(),
      lastTradeTimestamp: order.uTime ? parseInt(order.uTime) : undefined,
      reduceOnly: order.reduceOnly === 'YES'
    }
  }

  private mapOrderStatus(status: string): FuturesOrder['status'] {
    const statusMap: { [key: string]: FuturesOrder['status'] } = {
      'new': 'new',
      'partial_filled': 'partially_filled',
      'filled': 'filled',
      'cancelled': 'canceled',
      'rejected': 'rejected'
    }
    return statusMap[status] || 'new'
  }

  private formatTickerMessage(data: any): FuturesTicker {
    return {
      symbol: this.denormalizeSymbol(data.instId),
      high: parseFloat(data.high24h),
      low: parseFloat(data.low24h),
      bid: parseFloat(data.bidPr),
      bidVolume: parseFloat(data.bidSz),
      ask: parseFloat(data.askPr),
      askVolume: parseFloat(data.askSz),
      open: parseFloat(data.open),
      close: parseFloat(data.lastPr),
      last: parseFloat(data.lastPr),
      change: parseFloat(data.change24h),
      percentage: parseFloat(data.changeUtc24h) * 100,
      baseVolume: parseFloat(data.baseVolume),
      quoteVolume: parseFloat(data.usdtVolume),
      timestamp: parseInt(data.ts),
      datetime: new Date(parseInt(data.ts)).toISOString()
    }
  }

  private formatOrderBookMessage(data: any): Partial<FuturesOrderBook> {
    return {
      symbol: this.denormalizeSymbol(data.instId),
      bids: data.bids?.map((bid: any) => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: data.asks?.map((ask: any) => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: parseInt(data.ts)
    }
  }

  private formatKlineMessage(data: any): any {
    return {
      symbol: this.denormalizeSymbol(data.instId),
      openTime: parseInt(data.ts),
      closeTime: parseInt(data.ts) + 60000, // 1分钟K线
      open: parseFloat(data.o),
      high: parseFloat(data.h),
      low: parseFloat(data.l),
      close: parseFloat(data.c),
      volume: parseFloat(data.vol)
    }
  }

  private formatTradeMessages(data: any[]): FuturesTrade[] {
    return data.map(trade => ({
      id: trade.tradeId,
      timestamp: parseInt(trade.ts),
      datetime: new Date(parseInt(trade.ts)).toISOString(),
      symbol: this.denormalizeSymbol(trade.instId),
      side: trade.side.toLowerCase() as 'buy' | 'sell',
      amount: parseFloat(trade.sz),
      price: parseFloat(trade.px),
      cost: parseFloat(trade.sz) * parseFloat(trade.px)
    }))
  }

  private handleConnectionError(error: any): never {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new NetworkError(`网络连接失败: ${error.message}`, this.exchangeName)
    }
    if (error.code === '40013') {
      throw new AuthenticationError(`API认证失败: ${error.msg}`, this.exchangeName)
    }
    throw new Error(`连接Bitget失败: ${error.message || error.msg}`)
  }

  private handleApiError(error: any): never {
    if (error.code === '40015') {
      throw new InsufficientFunds('余额不足', this.exchangeName)
    }
    if (error.code === '40016') {
      throw new InvalidOrder(`订单参数错误: ${error.msg}`, this.exchangeName)
    }
    if (error.code === '40017') {
      throw new OrderNotFound('订单不存在', this.exchangeName)
    }
    
    this.handleError(error, 'Bitget API')
  }
}