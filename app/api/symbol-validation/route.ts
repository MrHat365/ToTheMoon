import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const exchange = searchParams.get('exchange')
    const symbol = searchParams.get('symbol')

    if (!exchange || !symbol) {
      return NextResponse.json({
        success: false,
        error: 'exchange和symbol参数是必需的'
      }, { status: 400 })
    }

    // 这里模拟Symbol验证逻辑
    // 在实际实现中，可以通过交易所API或数据库查询来验证Symbol是否存在
    console.log(`验证Symbol: ${exchange} - ${symbol}`)

    // 简单的Symbol格式验证
    const symbolPattern = /^[A-Z]+\/[A-Z]+$/
    if (!symbolPattern.test(symbol)) {
      return NextResponse.json({
        success: false,
        error: 'Symbol格式不正确，应为 BASE/QUOTE 格式，如 BTC/USDT'
      })
    }

    // 模拟一些常见的Symbol验证
    const commonSymbols = [
      'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT',
      'DOGE/USDT', 'XRP/USDT', 'DOT/USDT', 'MATIC/USDT', 'SHIB/USDT',
      'AVAX/USDT', 'LINK/USDT', 'UNI/USDT', 'LTC/USDT', 'BCH/USDT'
    ]

    // 模拟交易所支持的Symbol验证
    const isValidSymbol = commonSymbols.includes(symbol)

    if (isValidSymbol) {
      return NextResponse.json({
        success: true,
        data: {
          exchange,
          symbol,
          isValid: true,
          message: 'Symbol验证成功'
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: `交易所 ${exchange} 不支持交易对 ${symbol}`
      })
    }

  } catch (error) {
    console.error('Symbol验证API错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 })
  }
}