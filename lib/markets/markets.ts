import DatabaseClient from '@/lib/database/client'
import { COLLECTIONS, MarketInfo } from '@/lib/database/schemas'

/**
 * Markets数据查询模块
 * 简化版本，不依赖CCXT
 */

/**
 * 跨交易所查询指定Symbol的信息
 */
export async function findSymbolAcrossExchanges(symbol: string): Promise<MarketInfo[]> {
  const db = await DatabaseClient.getDb()
  const collection = db.collection<MarketInfo>(COLLECTIONS.MARKETS)

  const docs = await collection.find({ 
    unifiedSymbol: symbol 
  }).sort({ exchange: 1 }).toArray()

  return docs
}

/**
 * 根据交易所筛选Symbol信息
 */
export async function findSymbolsByExchange(symbol: string, exchanges: string[]): Promise<MarketInfo[]> {
  const db = await DatabaseClient.getDb()
  const collection = db.collection<MarketInfo>(COLLECTIONS.MARKETS)

  const docs = await collection.find({ 
    unifiedSymbol: symbol,
    exchange: { $in: exchanges }
  }).sort({ exchange: 1 }).toArray()

  return docs
}

/**
 * 获取所有可用的交易对列表
 */
export async function getAvailableSymbols(): Promise<string[]> {
  const db = await DatabaseClient.getDb()
  const collection = db.collection<MarketInfo>(COLLECTIONS.MARKETS)

  const symbols = await collection.distinct('unifiedSymbol')
  return symbols.sort()
}

/**
 * 获取所有可用的交易所列表
 */
export async function getAvailableExchanges(): Promise<string[]> {
  const db = await DatabaseClient.getDb()
  const collection = db.collection<MarketInfo>(COLLECTIONS.MARKETS)

  const exchanges = await collection.distinct('exchange')
  return exchanges.sort()
}

/**
 * 清除过期的市场数据
 */
export async function cleanupOldMarketData(daysOld: number = 7): Promise<number> {
  const db = await DatabaseClient.getDb()
  const collection = db.collection<MarketInfo>(COLLECTIONS.MARKETS)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  const result = await collection.deleteMany({
    timestamp: { $lt: cutoffDate }
  })

  console.log(`🧹 清理了 ${result.deletedCount} 条过期市场数据`)
  return result.deletedCount
}