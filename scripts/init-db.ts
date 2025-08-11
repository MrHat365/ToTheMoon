// 数据库初始化脚本
import { database } from '../lib/database'
import { TemplateService } from '../lib/services/template.service'

async function initializeDatabase() {
  try {
    // 连接数据库
    await database.connect()
    console.log('✅ Connected to MongoDB')

    // 创建示例模板数据
    const templateService = new TemplateService()
    
    const sampleTemplate = {
      name: 'BTC-USDT Strategy',
      symbol: 'BTC/USDT',
      status: 'enabled' as const,
      activeControl: {
        exchange: 'Binance',
        accounts: [
          {
            name: 'Binance Main',
            apiKey: 'your_binance_api_key',
            secretKey: 'your_binance_secret_key',
            passphrase: ''
          }
        ],
        executionMode: 'loop' as const
      },
      passiveControl: {
        exchange: 'Coinbase',
        accounts: [
          {
            name: 'Coinbase Sub',
            apiKey: 'your_coinbase_api_key',
            secretKey: 'your_coinbase_secret_key',
            passphrase: ''
          }
        ],
        executionMode: 'random' as const
      }
    }

    // 检查是否已有模板
    const existingTemplates = await templateService.getAllTemplates()
    
    if (existingTemplates.length === 0) {
      console.log('📝 Creating sample template...')
      await templateService.createTemplate(sampleTemplate)
      console.log('✅ Sample template created')
    } else {
      console.log('📊 Templates already exist, skipping creation')
    }

    // 创建索引
    const db = database.getDb()
    
    // 模板索引
    await db.collection('templates').createIndex({ name: 1 }, { unique: true })
    await db.collection('templates').createIndex({ status: 1 })
    await db.collection('templates').createIndex({ runningStatus: 1 })
    
    // 账户索引
    await db.collection('accounts').createIndex({ apiKey: 1 }, { unique: true })
    await db.collection('accounts').createIndex({ exchange: 1 })
    await db.collection('accounts').createIndex({ status: 1 })
    
    // 订单索引
    await db.collection('orders').createIndex({ templateId: 1 })
    await db.collection('orders').createIndex({ accountId: 1 })
    await db.collection('orders').createIndex({ status: 1 })
    await db.collection('orders').createIndex({ createdAt: -1 })
    
    // 交易记录索引
    await db.collection('trades').createIndex({ orderId: 1 })
    await db.collection('trades').createIndex({ templateId: 1 })
    await db.collection('trades').createIndex({ executedAt: -1 })

    console.log('✅ Database indexes created')
    console.log('🎉 Database initialization completed successfully!')

  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  } finally {
    await database.close()
  }
}

// 运行初始化
if (require.main === module) {
  initializeDatabase()
}

export { initializeDatabase }