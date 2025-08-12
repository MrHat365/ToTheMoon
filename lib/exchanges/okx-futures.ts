import { RestClientV5, WebsocketClientV5 } from 'okx-api'
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

export class OKXFuturesExchange extends BaseFuturesExchange {
  private client?: RestClientV5
  private wsClient?: WebsocketClientV5
  private wsStreams: Set<string> = new Set()

  constructor() {
    super('OKX')
  }

  async connect(credentials: ExchangeCredentials): Promise<void> {
    try {
      this.credentials = credentials
      
      if (!credentials.passphrase) {
        throw new Error('OKX requires passphrase')
      }
      
      this.client = new RestClientV5({
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        apiPass: credentials.passphrase,
        sandBox: credentials.sandbox || false
      })

      // 测试连接
      await this.client.getSystemTime()
      
      // 初始化WebSocket客户端
      this.wsClient = new WebsocketClientV5({
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        apiPass: credentials.passphrase,
        sandBox: credentials.sandbox || false
      })

      this.setupWebSocketHandlers()
      
      this.connected = true
      this.emit('connected')
      
      console.log('OKX 连接成功')
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
      console.log('OKX 连接已断开')
    } catch (error) {
      console.error('OKX 断开连接时出错:', error)
    }
  }

  async getFuturesAccount(): Promise<FuturesAccountInfo> {
    if (!this.client) throw new Error('未连接到OKX')
    
    try {
      const response = await this.client.getAccountBalance()
      const account = response.data[0]
      
      if (!account) {
        throw new Error('未找到账户信息')
      }

      const usdtDetail = account.details.find((d: any) => d.ccy === 'USDT') || account.details[0]
      
      return {
        accountId: 'okx_futures',
        name: 'OKX Futures Account',
        balance: parseFloat(account.totalEq),
        availableBalance: parseFloat(usdtDetail.availEq),
        unrealizedPnl: parseFloat(account.upl),
        marginRatio: parseFloat(account.mgnRatio),
        totalWalletBalance: parseFloat(account.totalEq),
        totalUnrealizedPnL: parseFloat(account.upl),
        totalMarginBalance: parseFloat(account.adjEq),
        totalMaintMargin: parseFloat(account.mmr),
        totalInitialMargin: parseFloat(account.imr),
        maxWithdrawAmount: parseFloat(usdtDetail.availEq)
      }
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesBalances(): Promise<FuturesBalance[]> {
    if (!this.client) throw new Error('未连接到OKX')
    
    try {
      const response = await this.client.getAccountBalance()
      const account = response.data[0]
      
      if (!account) {
        return []
      }

      return account.details.map((detail: any) => ({
        currency: detail.ccy,
        free: parseFloat(detail.availEq),
        used: parseFloat(detail.eq) - parseFloat(detail.availEq),
        total: parseFloat(detail.eq)
      }))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesPositions(symbol?: string): Promise<FuturesPosition[]> {
    if (!this.client) throw new Error('未连接到OKX')
    
    try {
      const params: any = { instType: 'SWAP' }
      if (symbol) {
        params.instId = this.normalizeSymbolForOKX(symbol)
      }
      
      const response = await this.client.getPositions(params)
      
      return response.data
        .filter((pos: any) => parseFloat(pos.pos) !== 0)
        .map((pos: any) => ({
          symbol: this.denormalizeSymbolFromOKX(pos.instId),
          side: pos.posSide === 'long' ? 'long' : pos.posSide === 'short' ? 'short' : 'both',
          size: Math.abs(parseFloat(pos.pos)),
          notional: Math.abs(parseFloat(pos.notionalUsd)),
          entryPrice: parseFloat(pos.avgPx),
          markPrice: parseFloat(pos.markPx),
          unrealizedPnl: parseFloat(pos.upl),
          percentage: parseFloat(pos.uplRatio) * 100,
          leverage: parseFloat(pos.lever),
          marginType: pos.mgnMode === 'cross' ? 'cross' : 'isolated',
          liquidationPrice: parseFloat(pos.liqPx || '0'),
          timestamp: parseInt(pos.uTime)
        }))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesTicker(symbol: string): Promise<FuturesTicker> {
    if (!this.client) throw new Error('未连接到OKX')
    
    try {
      const okxSymbol = this.normalizeSymbolForOKX(symbol)
      const response = await this.client.getTicker({ instId: okxSymbol })
      const ticker = response.data[0]
      
      if (!ticker) {
        throw new Error(`未找到交易对 ${symbol} 的行情数据`)
      }
      
      return {
        symbol: this.denormalizeSymbolFromOKX(ticker.instId),
        high: parseFloat(ticker.high24h),
        low: parseFloat(ticker.low24h),
        bid: parseFloat(ticker.bidPx),
        bidVolume: parseFloat(ticker.bidSz),
        ask: parseFloat(ticker.askPx),
        askVolume: parseFloat(ticker.askSz),
        open: parseFloat(ticker.open24h),
        close: parseFloat(ticker.last),
        last: parseFloat(ticker.last),
        change: parseFloat(ticker.last) - parseFloat(ticker.open24h),
        percentage: parseFloat(ticker.chgUtc8h) * 100,
        baseVolume: parseFloat(ticker.vol24h),
        quoteVolume: parseFloat(ticker.volCcy24h),
        timestamp: parseInt(ticker.ts),
        datetime: new Date(parseInt(ticker.ts)).toISOString()
      }
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesOrderBook(symbol: string, limit: number = 20): Promise<FuturesOrderBook> {
    if (!this.client) throw new Error('未连接到OKX')
    
    try {
      const okxSymbol = this.normalizeSymbolForOKX(symbol)
      const response = await this.client.getOrderbook({ instId: okxSymbol, sz: limit.toString() })
      const orderbook = response.data[0]
      
      return {
        symbol: this.denormalizeSymbolFromOKX(okxSymbol),
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
    if (!this.client) throw new Error('未连接到OKX')
    
    try {
      const okxSymbol = this.normalizeSymbolForOKX(symbol)
      const response = await this.client.getPublicTrades({ 
        instId: okxSymbol, 
        limit: limit.toString() 
      })
      
      return response.data.map((trade: any) => ({
        id: trade.tradeId,
        timestamp: parseInt(trade.ts),
        datetime: new Date(parseInt(trade.ts)).toISOString(),
        symbol: this.denormalizeSymbolFromOKX(okxSymbol),
        side: trade.side.toLowerCase() as 'buy' | 'sell',
        amount: parseFloat(trade.sz),
        price: parseFloat(trade.px),
        cost: parseFloat(trade.sz) * parseFloat(trade.px)
      }))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async createFuturesOrder(params: OrderRequest): Promise<FuturesOrder> {
    if (!this.client) throw new Error('未连接到OKX')
    
    try {
      const okxSymbol = this.normalizeSymbolForOKX(params.symbol)
      const clientOrderId = this.generateClientOrderId('okx')
      
      const orderParams: any = {
        instId: okxSymbol,
        tdMode: 'cross',
        side: params.side,
        ordType: params.type === 'market' ? 'market' : 'limit',
        sz: this.formatAmount(params.amount).toString(),
        clOrdId: clientOrderId
      }

      if (params.type === 'limit') {
        orderParams.px = this.formatPrice(params.price!).toString()
      }

      if (params.reduceOnly) {
        orderParams.reduceOnly = true
      }

      const response = await this.client.submitOrder(orderParams)
      
      if (response.data[0].sCode !== '0') {
        throw new Error(response.data[0].sMsg)
      }
      
      // 获取完整订单信息
      const orderInfo = await this.getFuturesOrder(response.data[0].ordId, params.symbol)
      return orderInfo
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async cancelFuturesOrder(orderId: string, symbol: string): Promise<FuturesOrder> {
    if (!this.client) throw new Error('未连接到OKX')
    
    try {
      const okxSymbol = this.normalizeSymbolForOKX(symbol)
      const response = await this.client.cancelOrder({
        instId: okxSymbol,
        ordId: orderId
      })
      
      if (response.data[0].sCode !== '0') {
        throw new Error(response.data[0].sMsg)
      }
      
      // 获取取消后的订单信息
      return await this.getFuturesOrder(orderId, symbol)
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesOrder(orderId: string, symbol: string): Promise<FuturesOrder> {
    if (!this.client) throw new Error('未连接到OKX')
    
    try {
      const okxSymbol = this.normalizeSymbolForOKX(symbol)
      const response = await this.client.getOrder({
        instId: okxSymbol,
        ordId: orderId
      })
      
      if (response.data.length === 0) {
        throw new OrderNotFound('订单不存在')
      }
      
      return this.formatOrder(response.data[0])
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesOrders(symbol?: string, limit: number = 100): Promise<FuturesOrder[]> {
    if (!this.client) throw new Error('未连接到OKX')
    
    try {
      const params: any = { 
        instType: 'SWAP',
        limit: limit.toString()
      }
      if (symbol) {
        params.instId = this.normalizeSymbolForOKX(symbol)
      }
      
      const response = await this.client.getOrderHistory(params)
      
      return response.data.map((order: any) => this.formatOrder(order))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async getFuturesOpenOrders(symbol?: string): Promise<FuturesOrder[]> {
    if (!this.client) throw new Error('未连接到OKX')
    
    try {
      const params: any = { instType: 'SWAP' }
      if (symbol) {
        params.instId = this.normalizeSymbolForOKX(symbol)
      }
      
      const response = await this.client.getActiveOrders(params)
      
      return response.data.map((order: any) => this.formatOrder(order))
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async setLeverage(symbol: string, leverage: number): Promise<any> {
    if (!this.client) throw new Error('未连接到OKX')
    
    try {
      const okxSymbol = this.normalizeSymbolForOKX(symbol)
      return await this.client.setLeverage({
        instId: okxSymbol,
        lever: leverage.toString(),
        mgnMode: 'cross'
      })
    } catch (error) {
      this.handleApiError(error)
    }
  }

  async setMarginType(symbol: string, marginType: 'isolated' | 'cross'): Promise<any> {
    if (!this.client) throw new Error('未连接到OKX')
    
    try {
      const okxSymbol = this.normalizeSymbolForOKX(symbol)
      // 注意: OKX 需要先设置杠杆模式
      return await this.client.setLeverage({
        instId: okxSymbol,
        lever: '10', // 默认杠杆
        mgnMode: marginType === 'cross' ? 'cross' : 'isolated'
      })
    } catch (error) {
      this.handleApiError(error)
    }
  }

  // WebSocket 实现
  protected doSubscribe(type: WSSubscriptionType, symbol?: string): void {
    if (!this.wsClient) return

    let channel = ''
    let instType = 'SWAP'
    
    switch (type) {
      case WSSubscriptionType.TICKER:
        channel = 'tickers'
        break
      case WSSubscriptionType.ORDERBOOK:
        channel = 'books'
        break
      case WSSubscriptionType.KLINE:
        channel = 'candle1m'
        break
      case WSSubscriptionType.TRADE:
        channel = 'trades'
        break
      case WSSubscriptionType.ACCOUNT:
        channel = 'account'
        instType = ''
        break
      case WSSubscriptionType.ORDER:
        channel = 'orders'
        instType = 'SWAP'
        break
      case WSSubscriptionType.POSITION:
        channel = 'positions'
        instType = 'SWAP'
        break
    }

    if (channel) {
      const subscribeId = symbol ? `${channel}:${this.normalizeSymbolForOKX(symbol)}` : channel
      
      if (!this.wsStreams.has(subscribeId)) {
        const args = symbol ? [{
          channel,
          instType,
          instId: this.normalizeSymbolForOKX(symbol)
        }] : instType ? [{
          channel,
          instType
        }] : [{
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
    let instType = 'SWAP'
    
    switch (type) {
      case WSSubscriptionType.TICKER:
        channel = 'tickers'
        break
      case WSSubscriptionType.ORDERBOOK:
        channel = 'books'
        break
      case WSSubscriptionType.KLINE:
        channel = 'candle1m'
        break
      case WSSubscriptionType.TRADE:
        channel = 'trades'
        break
      case WSSubscriptionType.ACCOUNT:
        channel = 'account'
        instType = ''
        break
      case WSSubscriptionType.ORDER:
        channel = 'orders'
        instType = 'SWAP'
        break
      case WSSubscriptionType.POSITION:
        channel = 'positions'
        instType = 'SWAP'
        break
    }

    if (channel) {
      const subscribeId = symbol ? `${channel}:${this.normalizeSymbolForOKX(symbol)}` : channel
      
      if (this.wsStreams.has(subscribeId)) {
        const args = symbol ? [{
          channel,
          instType,
          instId: this.normalizeSymbolForOKX(symbol)
        }] : instType ? [{
          channel,
          instType
        }] : [{
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
        case 'tickers':
          this.emitWebSocketData(WSSubscriptionType.TICKER, this.formatTickerMessage(data.data[0]), instId)
          break
        case 'books':
          this.emitWebSocketData(WSSubscriptionType.ORDERBOOK, this.formatOrderBookMessage(data.data[0]), instId)
          break
        case 'candle1m':
          this.emitWebSocketData(WSSubscriptionType.KLINE, this.formatKlineMessage(data.data[0]), instId)
          break
        case 'trades':
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
      orderId: order.ordId,
      clientOrderId: order.clOrdId,
      symbol: this.denormalizeSymbolFromOKX(order.instId),
      side: order.side,
      type: order.ordType,
      amount: parseFloat(order.sz),
      price: order.px ? parseFloat(order.px) : undefined,
      status: this.mapOrderStatus(order.state),
      timeInForce: order.tif,
      filled: parseFloat(order.fillSz || '0'),
      remaining: parseFloat(order.sz) - parseFloat(order.fillSz || '0'),
      cost: parseFloat(order.fillNotionalUsd || '0'),
      average: order.avgPx ? parseFloat(order.avgPx) : undefined,
      fee: parseFloat(order.fee || '0'),
      feeCurrency: order.feeCcy || 'USDT',
      timestamp: parseInt(order.cTime),
      datetime: new Date(parseInt(order.cTime)).toISOString(),
      lastTradeTimestamp: order.uTime ? parseInt(order.uTime) : undefined,
      reduceOnly: order.reduceOnly
    }
  }

  private mapOrderStatus(status: string): FuturesOrder['status'] {
    const statusMap: { [key: string]: FuturesOrder['status'] } = {
      'live': 'new',
      'partially_filled': 'partially_filled',
      'filled': 'filled',
      'canceled': 'canceled',
      'mmp_canceled': 'canceled'
    }
    return statusMap[status] || 'new'
  }

  // OKX特有的符号转换
  private normalizeSymbolForOKX(symbol: string): string {
    // BTC/USDT -> BTC-USDT-SWAP
    const parts = symbol.split('/')
    if (parts.length === 2) {
      return `${parts[0]}-${parts[1]}-SWAP`
    }
    return symbol
  }

  private denormalizeSymbolFromOKX(symbol: string): string {
    // BTC-USDT-SWAP -> BTC/USDT
    if (symbol.endsWith('-SWAP')) {
      const parts = symbol.replace('-SWAP', '').split('-')
      if (parts.length === 2) {
        return `${parts[0]}/${parts[1]}`
      }
    }
    return symbol
  }

  private formatTickerMessage(data: any): FuturesTicker {
    return {
      symbol: this.denormalizeSymbolFromOKX(data.instId),
      high: parseFloat(data.high24h),
      low: parseFloat(data.low24h),
      bid: parseFloat(data.bidPx),
      bidVolume: parseFloat(data.bidSz),
      ask: parseFloat(data.askPx),
      askVolume: parseFloat(data.askSz),
      open: parseFloat(data.open24h),
      close: parseFloat(data.last),
      last: parseFloat(data.last),
      change: parseFloat(data.last) - parseFloat(data.open24h),
      percentage: parseFloat(data.chgUtc8h) * 100,
      baseVolume: parseFloat(data.vol24h),
      quoteVolume: parseFloat(data.volCcy24h),
      timestamp: parseInt(data.ts),
      datetime: new Date(parseInt(data.ts)).toISOString()
    }
  }

  private formatOrderBookMessage(data: any): Partial<FuturesOrderBook> {
    return {
      symbol: this.denormalizeSymbolFromOKX(data.instId),
      bids: data.bids?.map((bid: any) => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: data.asks?.map((ask: any) => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: parseInt(data.ts)
    }
  }

  private formatKlineMessage(data: any): any {
    return {
      symbol: this.denormalizeSymbolFromOKX(data.instId),
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
      symbol: this.denormalizeSymbolFromOKX(trade.instId),
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
    if (error.code === '50013') {
      throw new AuthenticationError(`API认证失败: ${error.msg}`, this.exchangeName)
    }
    throw new Error(`连接OKX失败: ${error.message || error.msg}`)
  }

  private handleApiError(error: any): never {
    if (error.code === '51008') {
      throw new InsufficientFunds('余额不足', this.exchangeName)
    }
    if (error.code === '51004') {
      throw new InvalidOrder(`订单参数错误: ${error.msg}`, this.exchangeName)
    }
    if (error.code === '51603') {
      throw new OrderNotFound('订单不存在', this.exchangeName)
    }
    
    this.handleError(error, 'OKX API')
  }
}