import { NextRequest, NextResponse } from 'next/server'
import { getMarketsConfig, getExchanges } from '@/lib/config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    switch (type) {
      case 'markets': {
        const marketsConfig = getMarketsConfig()
        return NextResponse.json({
          success: true,
          data: marketsConfig
        })
      }

      case 'exchanges': {
        const exchanges = getExchanges()
        return NextResponse.json({
          success: true,
          data: exchanges
        })
      }

      default: {
        // 返回所有配置
        const marketsConfig = getMarketsConfig()
        const exchanges = getExchanges()
        
        return NextResponse.json({
          success: true,
          data: {
            markets: marketsConfig,
            exchanges: exchanges
          }
        })
      }
    }
  } catch (error) {
    console.error('配置API错误:', error)
    return NextResponse.json({
      success: false,
      error: '获取配置失败'
    }, { status: 500 })
  }
}