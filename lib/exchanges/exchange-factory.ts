import { FuturesExchangeInterface, ExchangeCredentials } from './types'
import { BinanceFuturesExchange } from './binance-futures'
import { BybitFuturesExchange } from './bybit-futures'
import { BitgetFuturesExchange } from './bitget-futures'
import { OKXFuturesExchange } from './okx-futures'

export type SupportedExchange = 'binance' | 'bybit' | 'bitget' | 'okx'

export class ExchangeFactory {
  private static instance: ExchangeFactory
  private supportedExchanges: Set<SupportedExchange>

  private constructor() {
    this.supportedExchanges = new Set(['binance', 'bybit', 'bitget', 'okx'])
  }

  static getInstance(): ExchangeFactory {
    if (!ExchangeFactory.instance) {
      ExchangeFactory.instance = new ExchangeFactory()
    }
    return ExchangeFactory.instance
  }

  /**
   * 创建交易所实例
   */
  createExchange(exchangeName: string): FuturesExchangeInterface {
    const normalizedName = exchangeName.toLowerCase() as SupportedExchange

    if (!this.supportedExchanges.has(normalizedName)) {
      throw new Error(`不支持的交易所: ${exchangeName}。支持的交易所: ${Array.from(this.supportedExchanges).join(', ')}`)
    }

    switch (normalizedName) {
      case 'binance':
        return new BinanceFuturesExchange()
      case 'bybit':
        return new BybitFuturesExchange()
      case 'bitget':
        return new BitgetFuturesExchange()
      case 'okx':
        return new OKXFuturesExchange()
      default:
        throw new Error(`交易所实现未找到: ${exchangeName}`)
    }
  }

  /**
   * 批量创建交易所实例
   */
  createMultipleExchanges(exchangeNames: string[]): Map<string, FuturesExchangeInterface> {
    const exchanges = new Map<string, FuturesExchangeInterface>()
    
    for (const name of exchangeNames) {
      try {
        const exchange = this.createExchange(name)
        exchanges.set(name.toLowerCase(), exchange)
      } catch (error) {
        console.error(`创建交易所 ${name} 实例失败:`, error)
      }
    }
    
    return exchanges
  }

  /**
   * 获取所有支持的交易所列表
   */
  getSupportedExchanges(): SupportedExchange[] {
    return Array.from(this.supportedExchanges)
  }

  /**
   * 检查是否支持指定交易所
   */
  isSupported(exchangeName: string): boolean {
    return this.supportedExchanges.has(exchangeName.toLowerCase() as SupportedExchange)
  }

  /**
   * 验证交易所配置
   */
  validateExchangeConfig(exchangeName: string, credentials: ExchangeCredentials): boolean {
    const normalizedName = exchangeName.toLowerCase() as SupportedExchange

    if (!this.isSupported(normalizedName)) {
      return false
    }

    // 基础验证
    if (!credentials.apiKey || !credentials.apiSecret) {
      return false
    }

    // OKX 需要额外的 passphrase
    if (normalizedName === 'okx' && !credentials.passphrase) {
      return false
    }

    return true
  }

  /**
   * 获取交易所特定的配置要求
   */
  getExchangeRequirements(exchangeName: string): { 
    requiredFields: string[]
    optionalFields: string[]
    description: string 
  } {
    const normalizedName = exchangeName.toLowerCase() as SupportedExchange

    const baseRequirements = {
      requiredFields: ['apiKey', 'apiSecret'],
      optionalFields: ['sandbox'],
      description: ''
    }

    switch (normalizedName) {
      case 'binance':
        return {
          ...baseRequirements,
          description: 'Binance Futures API - 需要API密钥和秘钥'
        }
      case 'bybit':
        return {
          ...baseRequirements,
          description: 'Bybit Futures API - 需要API密钥和秘钥'
        }
      case 'bitget':
        return {
          ...baseRequirements,
          optionalFields: [...baseRequirements.optionalFields, 'passphrase'],
          description: 'Bitget Futures API - 需要API密钥和秘钥，可选passphrase'
        }
      case 'okx':
        return {
          requiredFields: [...baseRequirements.requiredFields, 'passphrase'],
          optionalFields: baseRequirements.optionalFields,
          description: 'OKX Futures API - 需要API密钥、秘钥和passphrase'
        }
      default:
        throw new Error(`未知的交易所: ${exchangeName}`)
    }
  }

  /**
   * 获取交易所功能特性
   */
  getExchangeFeatures(exchangeName: string): {
    supportsFutures: boolean
    supportsSpot: boolean
    supportsWebSocket: boolean
    supportsOrderTypes: string[]
    leverageRange: { min: number, max: number }
  } {
    const normalizedName = exchangeName.toLowerCase() as SupportedExchange

    const baseFeatures = {
      supportsFutures: true,
      supportsSpot: false, // 目前只实现期货
      supportsWebSocket: true,
      supportsOrderTypes: ['market', 'limit'],
      leverageRange: { min: 1, max: 125 }
    }

    switch (normalizedName) {
      case 'binance':
        return {
          ...baseFeatures,
          leverageRange: { min: 1, max: 125 }
        }
      case 'bybit':
        return {
          ...baseFeatures,
          leverageRange: { min: 1, max: 100 }
        }
      case 'bitget':
        return {
          ...baseFeatures,
          leverageRange: { min: 1, max: 125 }
        }
      case 'okx':
        return {
          ...baseFeatures,
          leverageRange: { min: 1, max: 125 }
        }
      default:
        throw new Error(`未知的交易所: ${exchangeName}`)
    }
  }
}

// 导出单例实例
export const exchangeFactory = ExchangeFactory.getInstance()