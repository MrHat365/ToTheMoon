import * as yaml from 'js-yaml'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 配置管理工具
 * 从config.yaml文件中读取配置
 */

// 配置文件接口定义
export interface ExchangeConfig {
  id: string
  options: Record<string, any>
}

export interface MongoConfig {
  uri: string
  dbName: string
  collection: string
}

export interface AppConfig {
  EXCHANGES: string[]
  MARKETS?: ExchangeConfig[]
  MONGODB?: MongoConfig
}

// 配置文件路径
const CONFIG_PATH = path.resolve(process.cwd(), 'config.yaml')

// 缓存配置对象
let configCache: AppConfig | null = null

/**
 * 读取配置文件
 */
export function loadConfig(): AppConfig {
  // 如果已经缓存，直接返回
  if (configCache) {
    return configCache
  }

  try {
    // 检查配置文件是否存在
    if (!fs.existsSync(CONFIG_PATH)) {
      console.warn(`配置文件不存在: ${CONFIG_PATH}，使用默认配置`)
      return getDefaultConfig()
    }

    // 读取YAML文件内容
    const fileContent = fs.readFileSync(CONFIG_PATH, 'utf8')
    
    // 解析YAML
    const config = yaml.load(fileContent) as AppConfig
    
    // 验证配置格式
    if (!config || !Array.isArray(config.EXCHANGES)) {
      throw new Error('配置文件格式不正确，EXCHANGES必须是数组')
    }

    // 缓存配置
    configCache = config
    
    console.log(`✅ 已加载配置文件: ${CONFIG_PATH}`)
    console.log(`📊 可用交易所: ${config.EXCHANGES.join(', ')}`)
    
    return config

  } catch (error) {
    console.error(`❌ 加载配置文件失败: ${error}`)
    console.log('📋 使用默认配置')
    return getDefaultConfig()
  }
}

/**
 * 获取默认配置
 */
function getDefaultConfig(): AppConfig {
  return {
    EXCHANGES: ['Binance', 'Coinbase', 'Kraken'],
    MARKETS: [
      { id: 'binance', options: { defaultType: 'future', adjustForTimeDifference: true } },
      { id: 'okx', options: { defaultType: 'swap' } },
      { id: 'bybit', options: { defaultType: 'swap' } }
    ],
    MONGODB: {
      uri: 'mongodb://localhost:27017',
      dbName: 'to_the_moon',
      collection: 'markets'
    }
  }
}

/**
 * 获取交易所列表
 */
export function getExchanges(): string[] {
  const config = loadConfig()
  return config.EXCHANGES
}

/**
 * 重新加载配置（清除缓存）
 */
export function reloadConfig(): AppConfig {
  configCache = null
  return loadConfig()
}

/**
 * 验证交易所是否在配置列表中
 */
export function isValidExchange(exchange: string): boolean {
  const exchanges = getExchanges()
  return exchanges.includes(exchange)
}

/**
 * 获取配置文件路径
 */
export function getConfigPath(): string {
  return CONFIG_PATH
}

/**
 * 获取Markets配置
 */
export function getMarketsConfig(): ExchangeConfig[] {
  const config = loadConfig()
  return config.MARKETS || []
}

/**
 * 获取MongoDB配置
 */
export function getMongoConfig(): MongoConfig {
  const config = loadConfig()
  return config.MONGODB || {
    uri: 'mongodb://localhost:27017',
    dbName: 'to_the_moon',
    collection: 'markets'
  }
}