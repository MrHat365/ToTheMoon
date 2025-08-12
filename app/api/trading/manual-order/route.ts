import { NextRequest, NextResponse } from 'next/server'

// 手动下单请求接口
interface ManualOrderRequest {
  templateId: string
  controlType: 'active' | 'passive'
  orderType: 'GTC_LIMIT' | 'IOC_LIMIT' | 'MARKET'
  symbol: string
  side: 'buy' | 'sell'
  size: number
  price?: number // 被动控制需要价格
  orderBookLevel: number
  selectedAccountIds: string[]
}

// 订单执行结果
interface OrderExecutionResult {
  orderId: string
  accountId: string
  accountName: string
  status: 'success' | 'failed' | 'pending'
  exchangeOrderId?: string
  executedPrice?: number
  executedQuantity?: number
  errorMessage?: string
  timestamp: string
}

// API响应接口
interface ManualOrderResponse {
  success: boolean
  message: string
  data?: {
    batchId: string // 批次ID，用于跟踪多账户订单
    results: OrderExecutionResult[]
    summary: {
      total: number
      successful: number
      failed: number
      pending: number
    }
  }
  error?: string
}

// POST /api/trading/manual-order - 手动下单
export async function POST(request: NextRequest) {
  try {
    const body: ManualOrderRequest = await request.json()
    
    // 验证必填字段
    if (!body.templateId || !body.controlType || !body.orderType || !body.symbol || !body.side || !body.size) {
      return NextResponse.json({
        success: false,
        message: '缺少必填参数',
        error: '请检查 templateId, controlType, orderType, symbol, side, size 参数'
      } as ManualOrderResponse, { status: 400 })
    }
    
    if (body.selectedAccountIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: '未选择交易账户',
        error: '请至少选择一个交易账户'
      } as ManualOrderResponse, { status: 400 })
    }
    
    // 被动控制必须提供价格
    if (body.controlType === 'passive' && (body.orderType === 'GTC_LIMIT' || body.orderType === 'IOC_LIMIT') && !body.price) {
      return NextResponse.json({
        success: false,
        message: '被动控制限价单必须提供价格',
        error: '请输入订单价格'
      } as ManualOrderResponse, { status: 400 })
    }
    
    // 生成批次ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // 模拟订单执行结果
    const mockResults: OrderExecutionResult[] = body.selectedAccountIds.map((accountId, index) => {
      const isSuccess = Math.random() > 0.1 // 90% 成功率
      const basePrice = body.orderType === 'MARKET' ? (body.symbol === 'BTC/USDT' ? 42000 : 2500) : (body.price || 42000)
      const priceVariation = (Math.random() - 0.5) * 0.002 // ±0.2% 价格变动
      
      return {
        orderId: `order_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        accountId: accountId,
        accountName: `Account-${accountId.slice(-6)}`, // 简化账户名显示
        status: isSuccess ? 'success' : (Math.random() > 0.5 ? 'failed' : 'pending'),
        exchangeOrderId: isSuccess ? `EXG_${Math.random().toString(36).substr(2, 12).toUpperCase()}` : undefined,
        executedPrice: isSuccess ? Number((basePrice * (1 + priceVariation)).toFixed(6)) : undefined,
        executedQuantity: isSuccess ? body.size : undefined,
        errorMessage: !isSuccess ? ['余额不足', '价格偏差过大', '交易对暂停', '网络连接超时'][Math.floor(Math.random() * 4)] : undefined,
        timestamp: new Date().toISOString()
      }
    })
    
    // 统计结果
    const summary = {
      total: mockResults.length,
      successful: mockResults.filter(r => r.status === 'success').length,
      failed: mockResults.filter(r => r.status === 'failed').length,
      pending: mockResults.filter(r => r.status === 'pending').length
    }
    
    // 记录操作日志（实际应用中应保存到数据库）
    console.log('手动下单执行:', {
      batchId,
      templateId: body.templateId,
      controlType: body.controlType,
      orderType: body.orderType,
      symbol: body.symbol,
      side: body.side,
      size: body.size,
      price: body.price,
      orderBookLevel: body.orderBookLevel,
      accountCount: body.selectedAccountIds.length,
      summary
    })
    
    const response: ManualOrderResponse = {
      success: true,
      message: `手动下单执行完成，成功 ${summary.successful}/${summary.total} 个订单`,
      data: {
        batchId,
        results: mockResults,
        summary
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('手动下单失败:', error)
    return NextResponse.json({
      success: false,
      message: '手动下单执行失败',
      error: error.message || '服务器内部错误'
    } as ManualOrderResponse, { status: 500 })
  }
}

// GET /api/trading/manual-order - 查询手动下单历史
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')
    const controlType = searchParams.get('controlType')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    
    // 模拟历史订单数据
    const mockHistory = Array.from({ length: 20 }, (_, index) => ({
      batchId: `batch_${Date.now() - index * 60000}_mock${index}`,
      templateId: templateId || `template_${Math.random().toString(36).substr(2, 8)}`,
      controlType: controlType || (Math.random() > 0.5 ? 'active' : 'passive'),
      orderType: ['GTC_LIMIT', 'IOC_LIMIT', 'MARKET'][Math.floor(Math.random() * 3)],
      symbol: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'][Math.floor(Math.random() * 3)],
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      accountCount: Math.floor(Math.random() * 3) + 1,
      successCount: Math.floor(Math.random() * 3) + 1,
      totalAmount: Number((Math.random() * 1000 + 100).toFixed(2)),
      createdAt: new Date(Date.now() - index * 60000).toISOString()
    }))
    
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedData = mockHistory.slice(startIndex, endIndex)
    
    return NextResponse.json({
      success: true,
      data: {
        orders: paginatedData,
        pagination: {
          page,
          limit,
          total: mockHistory.length,
          totalPages: Math.ceil(mockHistory.length / limit)
        }
      }
    })
    
  } catch (error: any) {
    console.error('查询手动下单历史失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 })
  }
}