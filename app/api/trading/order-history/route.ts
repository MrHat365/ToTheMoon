import { NextRequest, NextResponse } from 'next/server'

// 订单历史记录接口
interface OrderHistory {
  id: string
  batchId?: string // 批次ID（手动下单时存在）
  templateId: string
  templateName: string
  controlType: 'active' | 'passive'
  exchange: string
  accountId: string
  accountName: string
  orderType: 'manual' | 'timed' // 订单来源类型
  tradeType: 'GTC_LIMIT' | 'IOC_LIMIT' | 'MARKET'
  symbol: string
  side: 'buy' | 'sell'
  size: number
  price?: number
  executedPrice?: number
  executedQuantity?: number
  status: 'success' | 'failed' | 'pending' | 'cancelled'
  exchangeOrderId?: string
  errorMessage?: string
  orderBookLevel?: number
  createdAt: string
  updatedAt: string
}

// 订单统计接口
interface OrderStatistics {
  total: number
  successful: number
  failed: number
  pending: number
  cancelled: number
  totalVolume: number
  averagePrice: number
  exchanges: { [key: string]: number }
  symbols: { [key: string]: number }
}

// API响应接口
interface OrderHistoryResponse {
  success: boolean
  data?: {
    orders: OrderHistory[]
    statistics: OrderStatistics
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
  error?: string
}

// GET /api/trading/order-history - 查询订单历史
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')
    const controlType = searchParams.get('controlType')
    const orderType = searchParams.get('orderType') // manual | timed
    const status = searchParams.get('status')
    const symbol = searchParams.get('symbol')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    
    // 模拟订单历史数据
    const mockOrders = Array.from({ length: 100 }, (_, index) => {
      const exchanges = ['Binance', 'Bybit', 'Bitget', 'OKX']
      const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT']
      const tradeTypes: ('GTC_LIMIT' | 'IOC_LIMIT' | 'MARKET')[] = ['GTC_LIMIT', 'IOC_LIMIT', 'MARKET']
      const statuses: ('success' | 'failed' | 'pending' | 'cancelled')[] = ['success', 'failed', 'pending', 'cancelled']
      const orderTypes: ('manual' | 'timed')[] = ['manual', 'timed']
      
      const randomExchange = exchanges[Math.floor(Math.random() * exchanges.length)]
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)]
      const randomTradeType = tradeTypes[Math.floor(Math.random() * tradeTypes.length)]
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
      const randomOrderType = orderTypes[Math.floor(Math.random() * orderTypes.length)]
      const isSuccess = randomStatus === 'success'
      const basePrice = randomSymbol === 'BTC/USDT' ? 42000 : randomSymbol === 'ETH/USDT' ? 2500 : 300
      const size = Number((Math.random() * 10 + 0.1).toFixed(4))
      
      return {
        id: `order_${Date.now() - index * 1000}_${Math.random().toString(36).substr(2, 9)}`,
        batchId: randomOrderType === 'manual' ? `batch_${Math.random().toString(36).substr(2, 9)}` : undefined,
        templateId: templateId || `template_${Math.random().toString(36).substr(2, 8)}`,
        templateName: `Trading Template ${Math.floor(index / 10) + 1}`,
        controlType: controlType as 'active' | 'passive' || (Math.random() > 0.5 ? 'active' : 'passive'),
        exchange: randomExchange,
        accountId: `acc_${randomExchange.toLowerCase()}_${Math.random().toString(36).substr(2, 6)}`,
        accountName: `${randomExchange} Account ${Math.floor(Math.random() * 5) + 1}`,
        orderType: randomOrderType,
        tradeType: randomTradeType,
        symbol: randomSymbol,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        size: size,
        price: randomTradeType !== 'MARKET' ? Number((basePrice * (0.98 + Math.random() * 0.04)).toFixed(6)) : undefined,
        executedPrice: isSuccess ? Number((basePrice * (0.99 + Math.random() * 0.02)).toFixed(6)) : undefined,
        executedQuantity: isSuccess ? size : undefined,
        status: randomStatus,
        exchangeOrderId: isSuccess ? `EXG_${Math.random().toString(36).substr(2, 12).toUpperCase()}` : undefined,
        errorMessage: !isSuccess && randomStatus === 'failed' ? ['余额不足', '价格偏差过大', '交易对暂停', '网络连接超时'][Math.floor(Math.random() * 4)] : undefined,
        orderBookLevel: Math.floor(Math.random() * 10) + 1,
        createdAt: new Date(Date.now() - index * 60000).toISOString(),
        updatedAt: new Date(Date.now() - index * 60000 + Math.random() * 30000).toISOString()
      }
    })
    
    // 应用筛选条件
    let filteredOrders = mockOrders
    
    if (templateId) {
      filteredOrders = filteredOrders.filter(order => order.templateId === templateId)
    }
    
    if (controlType) {
      filteredOrders = filteredOrders.filter(order => order.controlType === controlType)
    }
    
    if (orderType) {
      filteredOrders = filteredOrders.filter(order => order.orderType === orderType)
    }
    
    if (status) {
      filteredOrders = filteredOrders.filter(order => order.status === status)
    }
    
    if (symbol) {
      filteredOrders = filteredOrders.filter(order => order.symbol === symbol)
    }
    
    if (startDate) {
      filteredOrders = filteredOrders.filter(order => new Date(order.createdAt) >= new Date(startDate))
    }
    
    if (endDate) {
      filteredOrders = filteredOrders.filter(order => new Date(order.createdAt) <= new Date(endDate))
    }
    
    // 分页
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex)
    
    // 计算统计数据
    const statistics: OrderStatistics = {
      total: filteredOrders.length,
      successful: filteredOrders.filter(o => o.status === 'success').length,
      failed: filteredOrders.filter(o => o.status === 'failed').length,
      pending: filteredOrders.filter(o => o.status === 'pending').length,
      cancelled: filteredOrders.filter(o => o.status === 'cancelled').length,
      totalVolume: filteredOrders.reduce((sum, o) => sum + (o.executedQuantity || 0), 0),
      averagePrice: filteredOrders.filter(o => o.executedPrice).length > 0 
        ? filteredOrders.reduce((sum, o) => sum + (o.executedPrice || 0), 0) / filteredOrders.filter(o => o.executedPrice).length
        : 0,
      exchanges: filteredOrders.reduce((acc, o) => {
        acc[o.exchange] = (acc[o.exchange] || 0) + 1
        return acc
      }, {} as { [key: string]: number }),
      symbols: filteredOrders.reduce((acc, o) => {
        acc[o.symbol] = (acc[o.symbol] || 0) + 1
        return acc
      }, {} as { [key: string]: number })
    }
    
    const response: OrderHistoryResponse = {
      success: true,
      data: {
        orders: paginatedOrders,
        statistics,
        pagination: {
          page,
          limit,
          total: filteredOrders.length,
          totalPages: Math.ceil(filteredOrders.length / limit)
        }
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('查询订单历史失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    } as OrderHistoryResponse, { status: 500 })
  }
}

// DELETE /api/trading/order-history - 清除订单历史（可选功能）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')
    const olderThan = searchParams.get('olderThan') // 清除多少天前的记录
    
    if (!olderThan && !templateId) {
      return NextResponse.json({
        success: false,
        error: '请提供 templateId 或 olderThan 参数'
      }, { status: 400 })
    }
    
    // 模拟清除操作
    const deletedCount = Math.floor(Math.random() * 50) + 10
    
    console.log('订单历史清除操作:', {
      templateId,
      olderThan,
      deletedCount
    })
    
    return NextResponse.json({
      success: true,
      message: `已清除 ${deletedCount} 条订单历史记录`,
      data: {
        deletedCount,
        templateId,
        olderThan
      }
    })
    
  } catch (error: any) {
    console.error('清除订单历史失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 })
  }
}