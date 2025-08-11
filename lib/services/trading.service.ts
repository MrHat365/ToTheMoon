// 简化的交易服务
import { perpetualFactory } from '@/lib/exchanges/perpetual-exchange'
import { SimpleRepository } from '@/lib/database'

export class TradingService {
  private templatesRepo = new SimpleRepository('templates')
  private accountsRepo = new SimpleRepository('accounts')

  async placeManualOrder(
    templateId: string,
    accountId: string,
    controlType: 'active' | 'passive',
    orderType: string,
    orderData: any
  ) {
    try {
      // 获取模板信息
      const template = await this.templatesRepo.findById(templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      // 获取账户信息
      const control = controlType === 'active' ? template.activeControl : template.passiveControl
      const account = control.accounts.find((acc: any) => acc.name === accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      // 创建交易所连接
      const exchange = perpetualFactory.createExchange(control.exchange, {
        apiKey: account.apiKey,
        secretKey: account.secretKey,
        passphrase: account.passphrase
      })

      await exchange.connect()

      // 下单
      const result = await exchange.placeOrder({
        symbol: orderData.symbol,
        side: orderData.side,
        type: orderType.includes('LIMIT') ? 'limit' : 'market',
        amount: orderData.amount,
        price: orderData.price
      })

      return result
    } catch (error: any) {
      throw new Error(`Failed to place order: ${error.message}`)
    }
  }

  async startTimedTask(templateId: string, controlType: 'active' | 'passive') {
    // 简化实现
    console.log(`Starting timed task for template ${templateId}, control ${controlType}`)
    return { message: 'Timed task started' }
  }

  async stopTimedTask(templateId: string, controlType: 'active' | 'passive') {
    // 简化实现
    console.log(`Stopping timed task for template ${templateId}, control ${controlType}`)
    return { message: 'Timed task stopped' }
  }
}