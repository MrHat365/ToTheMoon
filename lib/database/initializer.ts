import { Db, Collection } from 'mongodb'
import DatabaseClient from './client'
import {
  COLLECTIONS,
  getAvailableExchanges,
  EXECUTION_MODES,
  ORDER_TYPES,
  TRADE_SIDES,
  AMOUNT_TYPES,
  Template,
  TimedTaskConfig,
  SystemLog
} from './schemas'

/**
 * 数据库初始化工具
 * 负责创建索引、初始化数据等
 */
export class DatabaseInitializer {
  private db: Db

  constructor(db: Db) {
    this.db = db
  }

  /**
   * 初始化整个数据库
   */
  public async initialize(): Promise<void> {
    console.log('开始初始化数据库...')
    
    try {
      // 1. 创建索引
      await this.createIndexes()
      
      // 2. 插入示例数据
      await this.insertSampleData()
      
      // 3. 记录初始化日志
      await this.logInitialization()
      
      console.log('数据库初始化完成！')
    } catch (error) {
      console.error('数据库初始化失败:', error)
      throw error
    }
  }

  /**
   * 创建所有集合的索引
   */
  private async createIndexes(): Promise<void> {
    console.log('创建数据库索引...')

    // 模板集合索引  
    const templatesCollection = this.db.collection(COLLECTIONS.TEMPLATES)
    await templatesCollection.createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { createdAt: -1 } }
    ])

    // 定时任务配置索引
    const timedTaskConfigsCollection = this.db.collection(COLLECTIONS.TIMED_TASK_CONFIGS)
    await timedTaskConfigsCollection.createIndexes([
      { key: { templateId: 1, controlType: 1 }, unique: true },
      { key: { isRunning: 1 } },
      { key: { updatedAt: -1 } }
    ])

    // 定时任务历史索引
    const timedTaskHistoriesCollection = this.db.collection(COLLECTIONS.TIMED_TASK_HISTORIES)
    await timedTaskHistoriesCollection.createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { templateId: 1, controlType: 1, startTime: -1 } },
      { key: { status: 1, startTime: -1 } },
      { key: { createdAt: -1 } }
    ])

    // 订单执行记录索引
    const orderExecutionsCollection = this.db.collection(COLLECTIONS.ORDER_EXECUTIONS)
    await orderExecutionsCollection.createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { historyId: 1, executionTime: -1 } },
      { key: { templateId: 1, controlType: 1, executionTime: -1 } },
      { key: { accountId: 1, status: 1 } },
      { key: { exchangeOrderId: 1 }, sparse: true },
      { key: { createdAt: -1 } }
    ])

    // 系统日志索引
    const systemLogsCollection = this.db.collection(COLLECTIONS.SYSTEM_LOGS)
    await systemLogsCollection.createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { level: 1, createdAt: -1 } },
      { key: { module: 1, action: 1, createdAt: -1 } },
      { key: { templateId: 1, createdAt: -1 }, sparse: true },
      // TTL索引 - 30天后自动删除日志
      { key: { createdAt: 1 }, expireAfterSeconds: 30 * 24 * 60 * 60 }
    ])

    // 市场信息索引
    const marketsCollection = this.db.collection(COLLECTIONS.MARKETS)
    await marketsCollection.createIndexes([
      { key: { unifiedSymbol: 1, exchange: 1 }, unique: true },
      { key: { unifiedSymbol: 1 } },
      { key: { exchange: 1 } },
      { key: { baseAsset: 1, quoteAsset: 1 } },
      { key: { isActive: 1 } },
      { key: { timestamp: -1 } },
      { key: { updatedAt: -1 } }
    ])

    console.log('索引创建完成')
  }

  /**
   * 插入示例数据
   */
  private async insertSampleData(): Promise<void> {
    console.log('插入示例数据...')

    const now = new Date()

    // 检查是否已有数据
    const templatesCount = await this.db.collection(COLLECTIONS.TEMPLATES).countDocuments()
    if (templatesCount > 0) {
      console.log('数据库已有数据，跳过示例数据插入')
      return
    }

    // 获取配置文件中的交易所列表
    const availableExchanges = getAvailableExchanges()
    console.log(`使用配置文件中的交易所: ${availableExchanges.join(', ')}`)

    // 确保至少有两个交易所来创建示例
    const primaryExchange = availableExchanges[0] || 'Binance'
    const secondaryExchange = availableExchanges[1] || availableExchanges[0] || 'OKX'
    const tertiaryExchange = availableExchanges[2] || availableExchanges[0] || 'Bybit'

    // 1. 插入示例模板
    const sampleTemplates: Template[] = [
      {
        id: 'template_btc_usdt_strategy',
        name: 'BTC-USDT Strategy',
        activeControl: {
          exchange: primaryExchange,
          accounts: [
            {
              id: `acc_${primaryExchange.toLowerCase()}_main`,
              name: `${primaryExchange} Main Account`,
              apiKey: `${primaryExchange.toLowerCase()}_api_key_placeholder`,
              secretKey: `${primaryExchange.toLowerCase()}_secret_key_placeholder`,
              passphrase: `${primaryExchange.toLowerCase()}_passphrase_placeholder`
            },
            {
              id: `acc_${primaryExchange.toLowerCase()}_sub`,
              name: `${primaryExchange} Sub Account`, 
              apiKey: `${primaryExchange.toLowerCase()}_sub_api_key_placeholder`,
              secretKey: `${primaryExchange.toLowerCase()}_sub_secret_key_placeholder`,
              passphrase: `${primaryExchange.toLowerCase()}_sub_passphrase_placeholder`
            }
          ],
          executionMode: EXECUTION_MODES.LOOP
        },
        passiveControl: {
          exchange: secondaryExchange,
          accounts: [
            {
              id: `acc_${secondaryExchange.toLowerCase()}_main`,
              name: `${secondaryExchange} Main Account`,
              apiKey: `${secondaryExchange.toLowerCase()}_api_key_placeholder`,
              secretKey: `${secondaryExchange.toLowerCase()}_secret_key_placeholder`,
              passphrase: `${secondaryExchange.toLowerCase()}_passphrase_placeholder`
            }
          ],
          executionMode: EXECUTION_MODES.RANDOM
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'template_eth_busd_arbitrage',
        name: 'ETH-BUSD Arbitrage',
        activeControl: {
          exchange: tertiaryExchange,
          accounts: [
            {
              id: `acc_${tertiaryExchange.toLowerCase()}_spot`,
              name: `${tertiaryExchange} Spot Account`,
              apiKey: `${tertiaryExchange.toLowerCase()}_api_key_placeholder`,
              secretKey: `${tertiaryExchange.toLowerCase()}_secret_key_placeholder`, 
              passphrase: `${tertiaryExchange.toLowerCase()}_passphrase_placeholder`
            }
          ],
          executionMode: EXECUTION_MODES.RANDOM
        },
        passiveControl: {
          exchange: primaryExchange,
          accounts: [
            {
              id: `acc_${primaryExchange.toLowerCase()}_futures`,
              name: `${primaryExchange} Futures Account`,
              apiKey: `${primaryExchange.toLowerCase()}_futures_api_key_placeholder`,
              secretKey: `${primaryExchange.toLowerCase()}_futures_secret_key_placeholder`,
              passphrase: `${primaryExchange.toLowerCase()}_futures_passphrase_placeholder`
            }
          ],
          executionMode: EXECUTION_MODES.LOOP
        },
        createdAt: now,
        updatedAt: now
      }
    ]

    await this.db.collection(COLLECTIONS.TEMPLATES).insertMany(sampleTemplates)

    // 2. 插入示例定时任务配置
    const sampleTimedTaskConfigs: TimedTaskConfig[] = [
      {
        templateId: 'template_btc_usdt_strategy',
        controlType: 'active',
        symbol: 'BTC/USDT',
        minSize: 0.01,
        maxSize: 0.1,
        tradeSide: TRADE_SIDES.BUY,
        orderType: ORDER_TYPES.GTC_LIMIT,
        minTime: 10,
        maxTime: 60,
        maxTradeAmount: 1000,
        amountType: AMOUNT_TYPES.USDT,
        orderBookLevel: 1,
        eatLimit: 0,
        selectedAccountIds: ['acc_binance_main'],
        executionMode: EXECUTION_MODES.LOOP,
        isRunning: false,
        createdAt: now,
        updatedAt: now
      },
      {
        templateId: 'template_btc_usdt_strategy', 
        controlType: 'passive',
        symbol: 'BTC/USDT',
        minSize: 0.005,
        maxSize: 0.05,
        tradeSide: TRADE_SIDES.SELL,
        orderType: ORDER_TYPES.GTC_LIMIT,
        minTime: 15,
        maxTime: 90,
        maxTradeAmount: 500,
        amountType: AMOUNT_TYPES.USDT,
        selectedAccountIds: ['acc_coinbase_main'],
        executionMode: EXECUTION_MODES.RANDOM,
        isRunning: false,
        createdAt: now,
        updatedAt: now
      }
    ]

    await this.db.collection(COLLECTIONS.TIMED_TASK_CONFIGS).insertMany(sampleTimedTaskConfigs)

    console.log('示例数据插入完成')
  }

  /**
   * 记录初始化日志
   */
  private async logInitialization(): Promise<void> {
    const initLog: SystemLog = {
      id: `init_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level: 'info',
      module: 'DatabaseInitializer',
      action: 'initialize',
      message: '数据库初始化完成',
      data: {
        collections: Object.values(COLLECTIONS),
        timestamp: new Date()
      },
      createdAt: new Date()
    }

    await this.db.collection(COLLECTIONS.SYSTEM_LOGS).insertOne(initLog)
  }

  /**
   * 清空所有数据（危险操作，仅用于开发环境）
   */
  public async dropAllCollections(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('在生产环境中不允许删除数据')
    }

    console.log('正在清空所有集合...')
    
    for (const collectionName of Object.values(COLLECTIONS)) {
      try {
        await this.db.collection(collectionName).drop()
        console.log(`集合 ${collectionName} 已删除`)
      } catch (error: any) {
        if (error.code === 26) {
          // 集合不存在，忽略错误
          console.log(`集合 ${collectionName} 不存在，跳过`)
        } else {
          throw error
        }
      }
    }

    console.log('所有集合清空完成')
  }

  /**
   * 验证数据库结构
   */
  public async validateStructure(): Promise<boolean> {
    console.log('验证数据库结构...')

    try {
      // 检查所有集合是否存在
      const collections = await this.db.listCollections().toArray()
      const collectionNames = collections.map(c => c.name)
      
      for (const expectedCollection of Object.values(COLLECTIONS)) {
        if (!collectionNames.includes(expectedCollection)) {
          console.error(`缺少集合: ${expectedCollection}`)
          return false
        }
      }

      // 检查索引
      for (const collectionName of Object.values(COLLECTIONS)) {
        const collection = this.db.collection(collectionName)
        const indexes = await collection.indexes()
        
        if (indexes.length === 0) {
          console.error(`集合 ${collectionName} 缺少索引`)
          return false
        }
      }

      console.log('数据库结构验证通过')
      return true
    } catch (error) {
      console.error('数据库结构验证失败:', error)
      return false
    }
  }
}

/**
 * 数据库初始化入口函数
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const db = await DatabaseClient.getDb()
    const initializer = new DatabaseInitializer(db)
    await initializer.initialize()
  } catch (error) {
    console.error('数据库初始化失败:', error)
    throw error
  }
}

/**
 * 重置数据库（仅开发环境）
 */
export async function resetDatabase(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('在生产环境中不允许重置数据库')
  }

  try {
    const db = await DatabaseClient.getDb()
    const initializer = new DatabaseInitializer(db)
    
    await initializer.dropAllCollections()
    await initializer.initialize()
    
    console.log('数据库重置完成')
  } catch (error) {
    console.error('数据库重置失败:', error)
    throw error
  }
}

/**
 * 验证数据库
 */
export async function validateDatabase(): Promise<boolean> {
  try {
    const db = await DatabaseClient.getDb()
    const initializer = new DatabaseInitializer(db)
    return await initializer.validateStructure()
  } catch (error) {
    console.error('数据库验证失败:', error)
    return false
  }
}