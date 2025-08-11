import { NextRequest, NextResponse } from 'next/server'
import { TradingService } from '@/lib/services/trading.service'

const tradingService = new TradingService()

// POST /api/trading/manual-order - 手动下单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      templateId,
      accountId,
      controlType,
      orderType,
      symbol,
      side,
      amount,
      price,
      level
    } = body

    // 验证必需参数
    if (!templateId || !accountId || !controlType || !orderType || !symbol || !side || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const orderData = {
      symbol,
      side,
      amount: parseFloat(amount),
      price: price ? parseFloat(price) : undefined,
      level
    }

    const orderResponse = await tradingService.placeManualOrder(
      templateId,
      accountId,
      controlType,
      orderType,
      orderData
    )

    return NextResponse.json({ 
      success: true, 
      data: orderResponse 
    }, { status: 201 })

  } catch (error: any) {
    console.error('Failed to place manual order:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to place manual order' },
      { status: 500 }
    )
  }
}