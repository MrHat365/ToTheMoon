import { NextResponse } from 'next/server'
import { getExchanges } from '@/lib/config'

/**
 * 获取交易所配置 API
 * GET /api/config/exchanges
 */
export async function GET() {
  try {
    const exchanges = getExchanges()
    
    return NextResponse.json({
      success: true,
      data: {
        exchanges
      }
    })
  } catch (error) {
    console.error('获取交易所配置失败:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to load exchange configuration'
    }, { status: 500 })
  }
}