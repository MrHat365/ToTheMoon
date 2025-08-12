import { MainClient, WebsocketClient } from 'binance'
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

export class BinanceFuturesExchange extends BaseFuturesExchange {
  private client?: MainClient
  private wsClient?: WebsocketClient
  private wsStreams: Set<string> = new Set()

  constructor() {
    super('Binance')
  }

  async connect(credentials: ExchangeCredentials): Promise<void> {
    try {
      this.credentials = credentials
      
      this.client = new MainClient({
        api_key: credentials.apiKey,
        api_secret: credentials.apiSecret,
        baseURL: credentials.sandbox ? 'https://testnet.binancefuture.com' : undefined
      })

      // 测试连接
      await this.client.testConnectivity()
      
      // 初始化WebSocket客户端
      this.wsClient = new WebsocketClient({
        api_key: credentials.apiKey,
        api_secret: credentials.apiSecret,
        baseURL: credentials.sandbox ? 'wss://stream.binancefuture.com' : undefined
      })

      this.setupWebSocketHandlers()
      
      this.connected = true
      this.emit('connected')
      
      console.log('Binance Futures 连接成功')
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
      console.log('Binance Futures 连接已断开')
    } catch (error) {
      console.error('Binance Futures 断开连接时出错:', error)
    }
  }

  async getFuturesAccount(): Promise<FuturesAccountInfo> {
    if (!this.client) throw new Error('未连接到Binance')
    
    try {
      const account = await this.client.getFuturesAccountInformation()
      
      return {
        accountId: 'binance_futures',
        name: 'Binance Futures Account',
        balance: parseFloat(account.totalWalletBalance),
        availableBalance: parseFloat(account.availableBalance || '0'),
        unrealizedPnl: parseFloat(account.totalUnrealizedPnL),
        marginRatio: parseFloat(account.totalMaintMargin) / parseFloat(account.totalWalletBalance),
        totalWalletBalance: parseFloat(account.totalWalletBalance),
        totalUnrealizedPnL: parseFloat(account.totalUnrealizedPnL),
        totalMarginBalance: parseFloat(account.totalMarginBalance),
        totalMaintMargin: parseFloat(account.totalMaintMargin),
        totalInitialMargin: parseFloat(account.totalInitialMargin),
        maxWithdrawAmount: parseFloat(account.maxWithdrawAmount)
      }
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesBalances(): Promise<FuturesBalance[]> {
    if (!this.client) throw new Error('未连接到Binance')
    
    try {
      const account = await this.client.getFuturesAccountInformation()
      
      return account.assets.map((asset: any) => ({
        currency: asset.asset,
        free: parseFloat(asset.availableBalance),
        used: parseFloat(asset.initialMargin),
        total: parseFloat(asset.walletBalance)
      }))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesPositions(symbol?: string): Promise<FuturesPosition[]> {
    if (!this.client) throw new Error('未连接到Binance')
    
    try {
      const positions = await this.client.getFuturesPositionInformation({ symbol })
      
      return positions
        .filter((pos: any) => parseFloat(pos.positionAmt) !== 0)
        .map((pos: any) => ({
          symbol: this.denormalizeSymbol(pos.symbol),
          side: parseFloat(pos.positionAmt) > 0 ? 'long' : 'short',
          size: Math.abs(parseFloat(pos.positionAmt)),
          notional: Math.abs(parseFloat(pos.notional)),
          entryPrice: parseFloat(pos.entryPrice),
          markPrice: parseFloat(pos.markPrice),
          unrealizedPnl: parseFloat(pos.unRealizedProfit),
          percentage: parseFloat(pos.percentage),
          leverage: parseInt(pos.leverage),
          marginType: pos.marginType.toLowerCase() as 'isolated' | 'cross',
          liquidationPrice: parseFloat(pos.liquidationPrice),
          timestamp: Date.now()
        }))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesTicker(symbol: string): Promise<FuturesTicker> {
    if (!this.client) throw new Error('未连接到Binance')
    
    try {
      const binanceSymbol = this.normalizeSymbol(symbol)
      const ticker = await this.client.get24hrChangeStatistics({ symbol: binanceSymbol })
      
      return {
        symbol: this.denormalizeSymbol(ticker.symbol),
        high: parseFloat(ticker.highPrice),
        low: parseFloat(ticker.lowPrice),
        bid: parseFloat(ticker.bidPrice),
        bidVolume: parseFloat(ticker.bidQty),
        ask: parseFloat(ticker.askPrice),
        askVolume: parseFloat(ticker.askQty),
        open: parseFloat(ticker.openPrice),
        close: parseFloat(ticker.lastPrice),
        last: parseFloat(ticker.lastPrice),
        change: parseFloat(ticker.priceChange),
        percentage: parseFloat(ticker.priceChangePercent),
        baseVolume: parseFloat(ticker.volume),
        quoteVolume: parseFloat(ticker.quoteVolume),
        timestamp: parseInt(ticker.closeTime),
        datetime: new Date(parseInt(ticker.closeTime)).toISOString()
      }
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesOrderBook(symbol: string, limit: number = 20): Promise<FuturesOrderBook> {
    if (!this.client) throw new Error('未连接到Binance')
    
    try {
      const binanceSymbol = this.normalizeSymbol(symbol)
      const orderbook = await this.client.getFuturesOrderBook({ symbol: binanceSymbol, limit })
      
      return {
        symbol: this.denormalizeSymbol(binanceSymbol),
        bids: orderbook.bids.map((bid: any) => [parseFloat(bid[0]), parseFloat(bid[1])]),
        asks: orderbook.asks.map((ask: any) => [parseFloat(ask[0]), parseFloat(ask[1])]),
        timestamp: orderbook.lastUpdateId,
        datetime: new Date().toISOString()
      }
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesTrades(symbol: string, limit: number = 100): Promise<FuturesTrade[]> {
    if (!this.client) throw new Error('未连接到Binance')
    
    try {
      const binanceSymbol = this.normalizeSymbol(symbol)
      const trades = await this.client.getFuturesAggregateTradeList({ symbol: binanceSymbol, limit })
      
      return trades.map((trade: any) => ({
        id: trade.a.toString(),
        timestamp: parseInt(trade.T),
        datetime: new Date(parseInt(trade.T)).toISOString(),
        symbol: this.denormalizeSymbol(binanceSymbol),
        side: trade.m ? 'sell' : 'buy',
        amount: parseFloat(trade.q),
        price: parseFloat(trade.p),
        cost: parseFloat(trade.q) * parseFloat(trade.p)
      }))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async createFuturesOrder(params: OrderRequest): Promise<FuturesOrder> {
    if (!this.client) throw new Error('未连接到Binance')
    
    try {
      const binanceSymbol = this.normalizeSymbol(params.symbol)
      const clientOrderId = this.generateClientOrderId('binance')
      
      const orderParams: any = {
        symbol: binanceSymbol,
        side: params.side.toUpperCase(),
        type: params.type.toUpperCase(),
        quantity: this.formatAmount(params.amount),
        newClientOrderId: clientOrderId
      }

      if (params.type === 'limit') {
        orderParams.price = this.formatPrice(params.price!)
        orderParams.timeInForce = params.timeInForce || 'GTC'
      }

      if (params.positionSide) {
        orderParams.positionSide = params.positionSide.toUpperCase()
      }

      if (params.reduceOnly) {
        orderParams.reduceOnly = params.reduceOnly
      }

      const order = await this.client.submitNewFuturesOrder(orderParams)
      
      return this.formatOrder(order)
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async cancelFuturesOrder(orderId: string, symbol: string): Promise<FuturesOrder> {
    if (!this.client) throw new Error('未连接到Binance')
    
    try {
      const binanceSymbol = this.normalizeSymbol(symbol)
      const order = await this.client.cancelFuturesOrder({
        symbol: binanceSymbol,
        orderId: parseInt(orderId)
      })
      
      return this.formatOrder(order)
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesOrder(orderId: string, symbol: string): Promise<FuturesOrder> {
    if (!this.client) throw new Error('未连接到Binance')
    
    try {
      const binanceSymbol = this.normalizeSymbol(symbol)
      const order = await this.client.getFuturesOrder({
        symbol: binanceSymbol,
        orderId: parseInt(orderId)
      })
      
      return this.formatOrder(order)
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesOrders(symbol?: string, limit: number = 100): Promise<FuturesOrder[]> {
    if (!this.client) throw new Error('未连接到Binance')
    
    try {
      const params: any = { limit }
      if (symbol) {
        params.symbol = this.normalizeSymbol(symbol)
      }
      
      const orders = await this.client.getAllFuturesOrders(params)
      
      return orders.map((order: any) => this.formatOrder(order))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesOpenOrders(symbol?: string): Promise<FuturesOrder[]> {
    if (!this.client) throw new Error('未连接到Binance')
    
    try {
      const params: any = {}
      if (symbol) {
        params.symbol = this.normalizeSymbol(symbol)
      }
      
      const orders = await this.client.getFuturesOpenOrders(params)
      
      return orders.map((order: any) => this.formatOrder(order))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async setLeverage(symbol: string, leverage: number): Promise<any> {
    if (!this.client) throw new Error('未连接到Binance')
    
    try {
      const binanceSymbol = this.normalizeSymbol(symbol)
      return await this.client.setFuturesLeverage({
        symbol: binanceSymbol,
        leverage
      })
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async setMarginType(symbol: string, marginType: 'isolated' | 'cross'): Promise<any> {
    if (!this.client) throw new Error('未连接到Binance')
    
    try {
      const binanceSymbol = this.normalizeSymbol(symbol)
      return await this.client.setMarginType({
        symbol: binanceSymbol,
        marginType: marginType.toUpperCase()
      })
    } catch (error) {
      this.handleApiError(error)
    }
  }

  // WebSocket 实现
  protected doSubscribe(type: WSSubscriptionType, symbol?: string): void {
    if (!this.wsClient) return

    let stream = ''
    
    switch (type) {
      case WSSubscriptionType.TICKER:
        if (symbol) {
          stream = `${this.normalizeSymbol(symbol).toLowerCase()}@ticker`
        }
        break
      case WSSubscriptionType.ORDERBOOK:
        if (symbol) {
          stream = `${this.normalizeSymbol(symbol).toLowerCase()}@depth`
        }
        break
      case WSSubscriptionType.KLINE:
        if (symbol) {
          stream = `${this.normalizeSymbol(symbol).toLowerCase()}@kline_1m`
        }
        break
      case WSSubscriptionType.TRADE:
        if (symbol) {
          stream = `${this.normalizeSymbol(symbol).toLowerCase()}@aggTrade`
        }
        break
      case WSSubscriptionType.ACCOUNT:
        // 用户数据流需要listenKey
        this.subscribeUserDataStream()
        return
    }

    if (stream && !this.wsStreams.has(stream)) {
      this.wsClient.subscribeSpotStream(stream)
      this.wsStreams.add(stream)
    }
  }

  protected doUnsubscribe(type: WSSubscriptionType, symbol?: string): void {
    if (!this.wsClient) return

    let stream = ''
    
    switch (type) {
      case WSSubscriptionType.TICKER:
        if (symbol) {
          stream = `${this.normalizeSymbol(symbol).toLowerCase()}@ticker`
        }
        break
      case WSSubscriptionType.ORDERBOOK:
        if (symbol) {
          stream = `${this.normalizeSymbol(symbol).toLowerCase()}@depth`
        }
        break
      case WSSubscriptionType.KLINE:
        if (symbol) {
          stream = `${this.normalizeSymbol(symbol).toLowerCase()}@kline_1m`
        }
        break
      case WSSubscriptionType.TRADE:
        if (symbol) {
          stream = `${this.normalizeSymbol(symbol).toLowerCase()}@aggTrade`
        }
        break
    }

    if (stream && this.wsStreams.has(stream)) {
      this.wsClient.unsubscribeSpotStream(stream)
      this.wsStreams.delete(stream)
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

    this.wsClient.on('message', (data) => {
      this.handleWebSocketMessage(data)
    })
  }

  private handleWebSocketMessage(data: any): void {
    try {
      const message = typeof data === 'string' ? JSON.parse(data) : data
      
      if (message.e) {
        switch (message.e) {
          case '24hrTicker':
            this.emitWebSocketData(WSSubscriptionType.TICKER, this.formatTickerMessage(message), message.s)
            break
          case 'depthUpdate':
            this.emitWebSocketData(WSSubscriptionType.ORDERBOOK, this.formatOrderBookMessage(message), message.s)
            break
          case 'kline':
            this.emitWebSocketData(WSSubscriptionType.KLINE, this.formatKlineMessage(message), message.s)
            break
          case 'aggTrade':
            this.emitWebSocketData(WSSubscriptionType.TRADE, this.formatTradeMessage(message), message.s)
            break
          case 'ACCOUNT_UPDATE':
            this.emitWebSocketData(WSSubscriptionType.ACCOUNT, message)
            break
          case 'ORDER_TRADE_UPDATE':
            this.emitWebSocketData(WSSubscriptionType.ORDER, this.formatOrder(message.o))
            break
        }
      }
    } catch (error) {
      console.error('处理WebSocket消息时出错:', error)
    }
  }

  private async subscribeUserDataStream(): Promise<void> {
    if (!this.client) return
    
    try {
      const listenKey = await this.client.getFuturesUserDataStream()
      this.wsClient?.subscribeSpotStream(listenKey.listenKey)
      
      // 定期刷新listenKey
      setInterval(async () => {
        try {
          await this.client?.keepAliveFuturesUserDataStream({ listenKey: listenKey.listenKey })
        } catch (error) {
          console.error('刷新listenKey失败:', error)
        }
      }, 30 * 60 * 1000) // 30分钟
    } catch (error) {
      console.error('订阅用户数据流失败:', error)
    }
  }

  private formatOrder(order: any): FuturesOrder {
    return {
      orderId: order.orderId?.toString() || order.clientOrderId,
      clientOrderId: order.clientOrderId,
      symbol: this.denormalizeSymbol(order.symbol),
      side: order.side.toLowerCase(),
      type: order.type.toLowerCase(),
      amount: parseFloat(order.origQty || order.quantity),
      price: order.price ? parseFloat(order.price) : undefined,
      status: this.mapOrderStatus(order.status),
      timeInForce: order.timeInForce,
      filled: parseFloat(order.executedQty || '0'),
      remaining: parseFloat(order.origQty || order.quantity) - parseFloat(order.executedQty || '0'),
      cost: parseFloat(order.cumQuote || '0'),
      average: order.avgPrice ? parseFloat(order.avgPrice) : undefined,
      fee: parseFloat(order.commission || '0'),
      feeCurrency: order.commissionAsset || 'USDT',
      timestamp: parseInt(order.time || order.updateTime),
      datetime: new Date(parseInt(order.time || order.updateTime)).toISOString(),
      positionSide: order.positionSide?.toLowerCase(),
      reduceOnly: order.reduceOnly
    }
  }

  private mapOrderStatus(status: string): FuturesOrder['status'] {
    const statusMap: { [key: string]: FuturesOrder['status'] } = {
      'NEW': 'new',
      'PARTIALLY_FILLED': 'partially_filled',
      'FILLED': 'filled',
      'CANCELED': 'canceled',
      'REJECTED': 'rejected',
      'EXPIRED': 'expired'
    }
    return statusMap[status] || 'new'
  }

  private formatTickerMessage(message: any): FuturesTicker {
    return {
      symbol: this.denormalizeSymbol(message.s),
      high: parseFloat(message.h),
      low: parseFloat(message.l),
      bid: parseFloat(message.b),
      bidVolume: parseFloat(message.B),
      ask: parseFloat(message.a),
      askVolume: parseFloat(message.A),
      open: parseFloat(message.o),
      close: parseFloat(message.c),
      last: parseFloat(message.c),
      change: parseFloat(message.P),
      percentage: parseFloat(message.P),
      baseVolume: parseFloat(message.v),
      quoteVolume: parseFloat(message.q),
      timestamp: parseInt(message.E),
      datetime: new Date(parseInt(message.E)).toISOString()
    }
  }

  private formatOrderBookMessage(message: any): Partial<FuturesOrderBook> {
    return {
      symbol: this.denormalizeSymbol(message.s),
      bids: message.b?.map((bid: any) => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: message.a?.map((ask: any) => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: parseInt(message.E)
    }
  }

  private formatKlineMessage(message: any): any {
    const k = message.k
    return {
      symbol: this.denormalizeSymbol(k.s),
      openTime: parseInt(k.t),
      closeTime: parseInt(k.T),
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
      interval: k.i
    }
  }

  private formatTradeMessage(message: any): FuturesTrade {
    return {
      id: message.a.toString(),
      timestamp: parseInt(message.E),
      datetime: new Date(parseInt(message.E)).toISOString(),
      symbol: this.denormalizeSymbol(message.s),
      side: message.m ? 'sell' : 'buy',
      amount: parseFloat(message.q),
      price: parseFloat(message.p),
      cost: parseFloat(message.q) * parseFloat(message.p)
    }
  }

  private handleConnectionError(error: any): never {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new NetworkError(`网络连接失败: ${error.message}`, this.exchangeName)
    }
    if (error.code === -2014 || error.code === -1022) {
      throw new AuthenticationError(`API认证失败: ${error.message}`, this.exchangeName)
    }
    throw new Error(`连接Binance失败: ${error.message}`)
  }

  private handleApiError(error: any): never {
    if (error.code === -1021) {
      throw new NetworkError('时间戳同步错误', this.exchangeName)
    }
    if (error.code === -2010) {
      throw new InsufficientFunds('余额不足', this.exchangeName)
    }
    if (error.code === -1013 || error.code === -1111) {
      throw new InvalidOrder(`订单参数错误: ${error.msg}`, this.exchangeName)
    }
    if (error.code === -2013) {
      throw new OrderNotFound('订单不存在', this.exchangeName)
    }
    
    this.handleError(error, 'Binance API')
  }
}