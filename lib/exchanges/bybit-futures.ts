import { RestClientV5, WebsocketClient } from 'bybit-api'
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

export class BybitFuturesExchange extends BaseFuturesExchange {
  private client?: RestClientV5
  private wsClient?: WebsocketClient
  private wsStreams: Set<string> = new Set()

  constructor() {
    super('Bybit')
  }

  async connect(credentials: ExchangeCredentials): Promise<void> {
    try {
      this.credentials = credentials
      
      this.client = new RestClientV5({
        key: credentials.apiKey,
        secret: credentials.apiSecret,
        testnet: credentials.sandbox || false
      })

      // 测试连接
      await this.client.getServerTime()
      
      // 初始化WebSocket客户端
      this.wsClient = new WebsocketClient({
        key: credentials.apiKey,
        secret: credentials.apiSecret,
        market: 'v5',
        testnet: credentials.sandbox || false
      })

      this.setupWebSocketHandlers()
      
      this.connected = true
      this.emit('connected')
      
      console.log('Bybit 连接成功')
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
      console.log('Bybit 连接已断开')
    } catch (error) {
      console.error('Bybit 断开连接时出错:', error)
    }
  }

  async getFuturesAccount(): Promise<FuturesAccountInfo> {
    if (!this.client) throw new Error('未连接到Bybit')
    
    try {
      const response = await this.client.getWalletBalance({ accountType: 'UNIFIED', coin: 'USDT' })
      const account = response.result.list[0]
      
      if (!account) {
        throw new Error('未找到账户信息')
      }

      const usdtCoin = account.coin.find((c: any) => c.coin === 'USDT') || account.coin[0]
      
      return {
        accountId: 'bybit_futures',
        name: 'Bybit Futures Account',
        balance: parseFloat(usdtCoin?.walletBalance || '0'),
        availableBalance: parseFloat(usdtCoin?.availableToWithdraw || '0'),
        unrealizedPnl: parseFloat(account.totalPerpUPL || '0'),
        marginRatio: parseFloat(account.totalInitialMargin || '0') / parseFloat(usdtCoin?.walletBalance || '1'),
        totalWalletBalance: parseFloat(usdtCoin?.walletBalance || '0'),
        totalUnrealizedPnL: parseFloat(account.totalPerpUPL || '0'),
        totalMarginBalance: parseFloat(account.totalMarginBalance || '0'),
        totalMaintMargin: parseFloat(account.totalMaintenanceMargin || '0'),
        totalInitialMargin: parseFloat(account.totalInitialMargin || '0'),
        maxWithdrawAmount: parseFloat(usdtCoin?.availableToWithdraw || '0')
      }
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesBalances(): Promise<FuturesBalance[]> {
    if (!this.client) throw new Error('未连接到Bybit')
    
    try {
      const response = await this.client.getWalletBalance({ accountType: 'UNIFIED' })
      const account = response.result.list[0]
      
      if (!account) {
        return []
      }

      return account.coin.map((coin: any) => ({
        currency: coin.coin,
        free: parseFloat(coin.availableToWithdraw),
        used: parseFloat(coin.walletBalance) - parseFloat(coin.availableToWithdraw),
        total: parseFloat(coin.walletBalance)
      }))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesPositions(symbol?: string): Promise<FuturesPosition[]> {
    if (!this.client) throw new Error('未连接到Bybit')
    
    try {
      const params: any = { category: 'linear', settleCoin: 'USDT' }
      if (symbol) {
        params.symbol = this.normalizeSymbol(symbol)
      }
      
      const response = await this.client.getPositionInfo(params)
      
      return response.result.list
        .filter((pos: any) => parseFloat(pos.size) > 0)
        .map((pos: any) => ({
          symbol: this.denormalizeSymbol(pos.symbol),
          side: pos.side.toLowerCase() as 'long' | 'short',
          size: parseFloat(pos.size),
          notional: parseFloat(pos.positionValue),
          entryPrice: parseFloat(pos.avgPrice),
          markPrice: parseFloat(pos.markPrice),
          unrealizedPnl: parseFloat(pos.unrealisedPnl),
          percentage: parseFloat(pos.unrealisedPnl) / parseFloat(pos.positionValue) * 100,
          leverage: parseFloat(pos.leverage),
          marginType: pos.tradeMode === 0 ? 'cross' : 'isolated',
          liquidationPrice: parseFloat(pos.liqPrice || '0'),
          timestamp: Date.now()
        }))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesTicker(symbol: string): Promise<FuturesTicker> {
    if (!this.client) throw new Error('未连接到Bybit')
    
    try {
      const bybitSymbol = this.normalizeSymbol(symbol)
      const response = await this.client.getTickers({ category: 'linear', symbol: bybitSymbol })
      const ticker = response.result.list[0]
      
      if (!ticker) {
        throw new Error(`未找到交易对 ${symbol} 的行情数据`)
      }
      
      return {
        symbol: this.denormalizeSymbol(ticker.symbol),
        high: parseFloat(ticker.highPrice24h),
        low: parseFloat(ticker.lowPrice24h),
        bid: parseFloat(ticker.bid1Price),
        bidVolume: parseFloat(ticker.bid1Size),
        ask: parseFloat(ticker.ask1Price),
        askVolume: parseFloat(ticker.ask1Size),
        open: parseFloat(ticker.prevPrice24h),
        close: parseFloat(ticker.lastPrice),
        last: parseFloat(ticker.lastPrice),
        change: parseFloat(ticker.price24hPcnt),
        percentage: parseFloat(ticker.price24hPcnt) * 100,
        baseVolume: parseFloat(ticker.volume24h),
        quoteVolume: parseFloat(ticker.turnover24h),
        timestamp: parseInt(ticker.time),
        datetime: new Date(parseInt(ticker.time)).toISOString()
      }
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesOrderBook(symbol: string, limit: number = 25): Promise<FuturesOrderBook> {
    if (!this.client) throw new Error('未连接到Bybit')
    
    try {
      const bybitSymbol = this.normalizeSymbol(symbol)
      const response = await this.client.getOrderbook({ category: 'linear', symbol: bybitSymbol, limit })
      const orderbook = response.result
      
      return {
        symbol: this.denormalizeSymbol(bybitSymbol),
        bids: orderbook.b.map((bid: any) => [parseFloat(bid[0]), parseFloat(bid[1])]),
        asks: orderbook.a.map((ask: any) => [parseFloat(ask[0]), parseFloat(ask[1])]),
        timestamp: parseInt(orderbook.ts),
        datetime: new Date(parseInt(orderbook.ts)).toISOString()
      }
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesTrades(symbol: string, limit: number = 100): Promise<FuturesTrade[]> {
    if (!this.client) throw new Error('未连接到Bybit')
    
    try {
      const bybitSymbol = this.normalizeSymbol(symbol)
      const response = await this.client.getPublicTradingHistory({ 
        category: 'linear', 
        symbol: bybitSymbol, 
        limit 
      })
      
      return response.result.list.map((trade: any) => ({
        id: trade.execId,
        timestamp: parseInt(trade.time),
        datetime: new Date(parseInt(trade.time)).toISOString(),
        symbol: this.denormalizeSymbol(bybitSymbol),
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
    if (!this.client) throw new Error('未连接到Bybit')
    
    try {
      const bybitSymbol = this.normalizeSymbol(params.symbol)
      const clientOrderId = this.generateClientOrderId('bybit')
      
      const orderParams: any = {
        category: 'linear',
        symbol: bybitSymbol,
        side: params.side.charAt(0).toUpperCase() + params.side.slice(1),
        orderType: params.type === 'market' ? 'Market' : 'Limit',
        qty: this.formatAmount(params.amount).toString(),
        orderLinkId: clientOrderId
      }

      if (params.type === 'limit') {
        orderParams.price = this.formatPrice(params.price!).toString()
        orderParams.timeInForce = params.timeInForce || 'GTC'
      }

      if (params.reduceOnly) {
        orderParams.reduceOnly = params.reduceOnly
      }

      const response = await this.client.submitOrder(orderParams)
      
      // 获取完整订单信息
      const orderInfo = await this.getFuturesOrder(response.result.orderId, params.symbol)
      return orderInfo
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async cancelFuturesOrder(orderId: string, symbol: string): Promise<FuturesOrder> {
    if (!this.client) throw new Error('未连接到Bybit')
    
    try {
      const bybitSymbol = this.normalizeSymbol(symbol)
      await this.client.cancelOrder({
        category: 'linear',
        symbol: bybitSymbol,
        orderId
      })
      
      // 获取取消后的订单信息
      return await this.getFuturesOrder(orderId, symbol)
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesOrder(orderId: string, symbol: string): Promise<FuturesOrder> {
    if (!this.client) throw new Error('未连接到Bybit')
    
    try {
      const bybitSymbol = this.normalizeSymbol(symbol)
      const response = await this.client.getActiveOrders({
        category: 'linear',
        symbol: bybitSymbol,
        orderId
      })
      
      if (response.result.list.length === 0) {
        // 查询历史订单
        const historyResponse = await this.client.getOrderHistory({
          category: 'linear',
          symbol: bybitSymbol,
          orderId
        })
        
        if (historyResponse.result.list.length === 0) {
          throw new OrderNotFound('订单不存在')
        }
        
        return this.formatOrder(historyResponse.result.list[0])
      }
      
      return this.formatOrder(response.result.list[0])
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesOrders(symbol?: string, limit: number = 50): Promise<FuturesOrder[]> {
    if (!this.client) throw new Error('未连接到Bybit')
    
    try {
      const params: any = { category: 'linear', limit }
      if (symbol) {
        params.symbol = this.normalizeSymbol(symbol)
      }
      
      const response = await this.client.getOrderHistory(params)
      
      return response.result.list.map((order: any) => this.formatOrder(order))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesOpenOrders(symbol?: string): Promise<FuturesOrder[]> {
    if (!this.client) throw new Error('未连接到Bybit')
    
    try {
      const params: any = { category: 'linear' }
      if (symbol) {
        params.symbol = this.normalizeSymbol(symbol)
      }
      
      const response = await this.client.getActiveOrders(params)
      
      return response.result.list.map((order: any) => this.formatOrder(order))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async setLeverage(symbol: string, leverage: number): Promise<any> {
    if (!this.client) throw new Error('未连接到Bybit')
    
    try {
      const bybitSymbol = this.normalizeSymbol(symbol)
      return await this.client.setLeverage({
        category: 'linear',
        symbol: bybitSymbol,
        buyLeverage: leverage.toString(),
        sellLeverage: leverage.toString()
      })
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async setMarginType(symbol: string, marginType: 'isolated' | 'cross'): Promise<any> {
    if (!this.client) throw new Error('未连接到Bybit')
    
    try {
      const bybitSymbol = this.normalizeSymbol(symbol)
      return await this.client.switchIsolatedMargin({
        category: 'linear',
        symbol: bybitSymbol,
        tradeMode: marginType === 'cross' ? 0 : 1,
        buyLeverage: '10', // 默认杠杆
        sellLeverage: '10'
      })
    } catch (error) {
      this.handleApiError(error)
    }
  }

  // WebSocket 实现
  protected doSubscribe(type: WSSubscriptionType, symbol?: string): void {
    if (!this.wsClient) return

    let topic = ''
    
    switch (type) {
      case WSSubscriptionType.TICKER:
        if (symbol) {
          topic = `tickers.${this.normalizeSymbol(symbol)}`
        }
        break
      case WSSubscriptionType.ORDERBOOK:
        if (symbol) {
          topic = `orderbook.1.${this.normalizeSymbol(symbol)}`
        }
        break
      case WSSubscriptionType.KLINE:
        if (symbol) {
          topic = `kline.1.${this.normalizeSymbol(symbol)}`
        }
        break
      case WSSubscriptionType.TRADE:
        if (symbol) {
          topic = `publicTrade.${this.normalizeSymbol(symbol)}`
        }
        break
      case WSSubscriptionType.ACCOUNT:
        topic = 'wallet'
        break
      case WSSubscriptionType.ORDER:
        topic = 'order'
        break
      case WSSubscriptionType.POSITION:
        topic = 'position'
        break
    }

    if (topic && !this.wsStreams.has(topic)) {
      this.wsClient?.subscribe(topic)
      this.wsStreams.add(topic)
    }
  }

  protected doUnsubscribe(type: WSSubscriptionType, symbol?: string): void {
    if (!this.wsClient) return

    let topic = ''
    
    switch (type) {
      case WSSubscriptionType.TICKER:
        if (symbol) {
          topic = `tickers.${this.normalizeSymbol(symbol)}`
        }
        break
      case WSSubscriptionType.ORDERBOOK:
        if (symbol) {
          topic = `orderbook.1.${this.normalizeSymbol(symbol)}`
        }
        break
      case WSSubscriptionType.KLINE:
        if (symbol) {
          topic = `kline.1.${this.normalizeSymbol(symbol)}`
        }
        break
      case WSSubscriptionType.TRADE:
        if (symbol) {
          topic = `publicTrade.${this.normalizeSymbol(symbol)}`
        }
        break
      case WSSubscriptionType.ACCOUNT:
        topic = 'wallet'
        break
      case WSSubscriptionType.ORDER:
        topic = 'order'
        break
      case WSSubscriptionType.POSITION:
        topic = 'position'
        break
    }

    if (topic && this.wsStreams.has(topic)) {
      this.wsClient?.unsubscribe(topic)
      this.wsStreams.delete(topic)
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
      if (!data.topic) return

      const topic = data.topic
      
      if (topic.startsWith('tickers.')) {
        const symbol = topic.replace('tickers.', '')
        this.emitWebSocketData(WSSubscriptionType.TICKER, this.formatTickerMessage(data.data), symbol)
      } else if (topic.startsWith('orderbook.')) {
        const symbol = topic.split('.')[2]
        this.emitWebSocketData(WSSubscriptionType.ORDERBOOK, this.formatOrderBookMessage(data.data), symbol)
      } else if (topic.startsWith('kline.')) {
        const symbol = topic.split('.')[2]
        this.emitWebSocketData(WSSubscriptionType.KLINE, this.formatKlineMessage(data.data), symbol)
      } else if (topic.startsWith('publicTrade.')) {
        const symbol = topic.replace('publicTrade.', '')
        this.emitWebSocketData(WSSubscriptionType.TRADE, this.formatTradeMessages(data.data), symbol)
      } else if (topic === 'wallet') {
        this.emitWebSocketData(WSSubscriptionType.ACCOUNT, data.data)
      } else if (topic === 'order') {
        this.emitWebSocketData(WSSubscriptionType.ORDER, data.data.map((order: any) => this.formatOrder(order)))
      } else if (topic === 'position') {
        this.emitWebSocketData(WSSubscriptionType.POSITION, data.data)
      }
    } catch (error) {
      console.error('处理WebSocket消息时出错:', error)
    }
  }

  private formatOrder(order: any): FuturesOrder {
    return {
      orderId: order.orderId,
      clientOrderId: order.orderLinkId,
      symbol: this.denormalizeSymbol(order.symbol),
      side: order.side.toLowerCase(),
      type: order.orderType.toLowerCase(),
      amount: parseFloat(order.qty),
      price: order.price ? parseFloat(order.price) : undefined,
      status: this.mapOrderStatus(order.orderStatus),
      timeInForce: order.timeInForce,
      filled: parseFloat(order.cumExecQty || '0'),
      remaining: parseFloat(order.qty) - parseFloat(order.cumExecQty || '0'),
      cost: parseFloat(order.cumExecValue || '0'),
      average: order.avgPrice ? parseFloat(order.avgPrice) : undefined,
      fee: parseFloat(order.cumExecFee || '0'),
      feeCurrency: 'USDT',
      timestamp: parseInt(order.createdTime),
      datetime: new Date(parseInt(order.createdTime)).toISOString(),
      lastTradeTimestamp: order.updatedTime ? parseInt(order.updatedTime) : undefined,
      reduceOnly: order.reduceOnly
    }
  }

  private mapOrderStatus(status: string): FuturesOrder['status'] {
    const statusMap: { [key: string]: FuturesOrder['status'] } = {
      'New': 'new',
      'PartiallyFilled': 'partially_filled', 
      'Filled': 'filled',
      'Cancelled': 'canceled',
      'Rejected': 'rejected',
      'Deactivated': 'expired'
    }
    return statusMap[status] || 'new'
  }

  private formatTickerMessage(data: any): FuturesTicker {
    return {
      symbol: this.denormalizeSymbol(data.symbol),
      high: parseFloat(data.highPrice24h),
      low: parseFloat(data.lowPrice24h),
      bid: parseFloat(data.bid1Price),
      bidVolume: parseFloat(data.bid1Size),
      ask: parseFloat(data.ask1Price),
      askVolume: parseFloat(data.ask1Size),
      open: parseFloat(data.prevPrice24h),
      close: parseFloat(data.lastPrice),
      last: parseFloat(data.lastPrice),
      change: parseFloat(data.price24hPcnt) * 100,
      percentage: parseFloat(data.price24hPcnt) * 100,
      baseVolume: parseFloat(data.volume24h),
      quoteVolume: parseFloat(data.turnover24h),
      timestamp: parseInt(data.time),
      datetime: new Date(parseInt(data.time)).toISOString()
    }
  }

  private formatOrderBookMessage(data: any): Partial<FuturesOrderBook> {
    return {
      symbol: this.denormalizeSymbol(data.s),
      bids: data.b?.map((bid: any) => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: data.a?.map((ask: any) => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: parseInt(data.ts)
    }
  }

  private formatKlineMessage(data: any): any {
    const kline = data[0]
    return {
      symbol: this.denormalizeSymbol(data.symbol),
      openTime: parseInt(kline.start),
      closeTime: parseInt(kline.end),
      open: parseFloat(kline.open),
      high: parseFloat(kline.high),
      low: parseFloat(kline.low),
      close: parseFloat(kline.close),
      volume: parseFloat(kline.volume),
      interval: kline.interval
    }
  }

  private formatTradeMessages(data: any[]): FuturesTrade[] {
    return data.map(trade => ({
      id: trade.execId,
      timestamp: parseInt(trade.time),
      datetime: new Date(parseInt(trade.time)).toISOString(),
      symbol: this.denormalizeSymbol(trade.symbol),
      side: trade.side.toLowerCase() as 'buy' | 'sell',
      amount: parseFloat(trade.size),
      price: parseFloat(trade.price),
      cost: parseFloat(trade.size) * parseFloat(trade.price)
    }))
  }

  private handleConnectionError(error: any): never {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new NetworkError(`网络连接失败: ${error.message}`, this.exchangeName)
    }
    if (error.ret_code === 10003) {
      throw new AuthenticationError(`API认证失败: ${error.ret_msg}`, this.exchangeName)
    }
    throw new Error(`连接Bybit失败: ${error.message || error.ret_msg}`)
  }

  private handleApiError(error: any): never {
    if (error.ret_code === 110001) {
      throw new InsufficientFunds('余额不足', this.exchangeName)
    }
    if (error.ret_code === 110017) {
      throw new InvalidOrder(`订单参数错误: ${error.ret_msg}`, this.exchangeName)
    }
    if (error.ret_code === 110025) {
      throw new OrderNotFound('订单不存在', this.exchangeName)
    }
    
    this.handleError(error, 'Bybit API')
  }
}