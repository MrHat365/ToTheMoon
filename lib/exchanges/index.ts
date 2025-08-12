// 导出所有类型定义
export * from './types'

// 导出交易所实现
export { BinanceFuturesExchange } from './binance-futures'
export { BybitFuturesExchange } from './bybit-futures'
export { BitgetFuturesExchange } from './bitget-futures'
export { OKXFuturesExchange } from './okx-futures'
export { BaseFuturesExchange } from './base-exchange'

// 导出工厂和管理器
export { ExchangeFactory, exchangeFactory, type SupportedExchange } from './exchange-factory'
export { ExchangeManager, exchangeManager } from './exchange-manager'

// 便捷方法：快速创建交易所管理器实例
export async function createExchangeManager(): Promise<ExchangeManager> {
  return ExchangeManager.getInstance()
}

// 便捷方法：快速连接多个交易所
export async function connectMultipleExchanges(configs: Array<{
  name: string
  credentials: any
}>): Promise<ExchangeManager> {
  const manager = ExchangeManager.getInstance()
  
  for (const config of configs) {
    try {
      await manager.addExchange(config.name, config.credentials, true)
      console.log(`✅ 交易所 ${config.name} 连接成功`)
    } catch (error) {
      console.error(`❌ 交易所 ${config.name} 连接失败:`, error)
    }
  }
  
  return manager
}

// 便捷方法：获取所有支持的交易所
export function getSupportedExchanges(): string[] {
  return ExchangeFactory.getInstance().getSupportedExchanges()
}

// 便捷方法：验证交易所配置
export function validateExchangeConfig(exchangeName: string, credentials: any): boolean {
  return ExchangeFactory.getInstance().validateExchangeConfig(exchangeName, credentials)
}

// 使用示例导出
export const USAGE_EXAMPLES = {
  // 单个交易所连接示例
  singleExchange: `
import { exchangeManager } from '@/lib/exchanges'

// 添加并连接Binance
await exchangeManager.addExchange('binance', {
  apiKey: 'your-api-key',
  apiSecret: 'your-secret-key',
  sandbox: true // 测试环境
})

// 获取账户信息
const binance = exchangeManager.getExchange('binance')
const account = await binance.getFuturesAccount()
`,

  // 多个交易所连接示例
  multipleExchanges: `
import { connectMultipleExchanges } from '@/lib/exchanges'

// 批量连接多个交易所
const manager = await connectMultipleExchanges([
  {
    name: 'binance',
    credentials: { apiKey: 'key1', apiSecret: 'secret1' }
  },
  {
    name: 'okx',
    credentials: { apiKey: 'key2', apiSecret: 'secret2', passphrase: 'pass2' }
  }
])

// 获取所有账户信息
const allAccounts = await manager.getAllAccountsInfo()
`,

  // WebSocket数据订阅示例
  websocketSubscription: `
import { exchangeManager, WSSubscriptionType } from '@/lib/exchanges'

// 订阅所有交易所的行情数据
exchangeManager.subscribeToAllExchanges(
  WSSubscriptionType.TICKER,
  'BTC/USDT',
  (exchangeName, data) => {
    console.log(\`\${exchangeName} 行情更新:\`, data)
  }
)
`,

  // 交易示例
  trading: `
import { exchangeManager } from '@/lib/exchanges'

// 在Binance下限价买单
const order = await exchangeManager.createOrder('binance', {
  symbol: 'BTC/USDT',
  side: 'buy',
  type: 'limit',
  amount: 0.001,
  price: 45000,
  timeInForce: 'GTC'
})
`,

  // 健康监控示例
  healthMonitoring: `
import { exchangeManager } from '@/lib/exchanges'

// 监听交易所连接状态
exchangeManager.on('exchangeConnected', ({ name }) => {
  console.log(\`交易所 \${name} 已连接\`)
})

exchangeManager.on('exchangeError', ({ name, error }) => {
  console.error(\`交易所 \${name} 出错:\`, error)
})

// 获取所有交易所健康状态
const healthStatuses = exchangeManager.getAllExchangeStatuses()
`
}