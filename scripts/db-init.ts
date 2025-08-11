#!/usr/bin/env tsx

/**
 * 数据库初始化脚本
 * 
 * 使用方法:
 * npm run init-db              # 初始化数据库
 * npm run init-db -- --reset   # 重置数据库
 * npm run init-db -- --validate # 验证数据库
 */

// 加载环境变量
import * as fs from 'fs'
import * as path from 'path'

// 手动加载.env文件
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim()
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=')
      const value = valueParts.join('=').trim()
      if (key && value) {
        process.env[key.trim()] = value
      }
    }
  })
  console.log('✅ 环境变量已加载')
  console.log('🔍 数据库配置:')
  console.log(`   MONGODB_HOST: ${process.env.MONGODB_HOST || 'localhost'}`)
  console.log(`   MONGODB_PORT: ${process.env.MONGODB_PORT || '27017'}`)
  console.log(`   MONGODB_USERNAME: ${process.env.MONGODB_USERNAME ? '***' : '未设置'}`)
  console.log(`   MONGODB_DB: ${process.env.MONGODB_DB || 'to_the_moon'}`)
} else {
  console.warn('⚠️  .env文件不存在，使用默认配置')
}

import { initializeDatabase, resetDatabase, validateDatabase } from '../lib/database/initializer'
import DatabaseClient from '../lib/database/client'

async function main() {
  const args = process.argv.slice(2)
  const isReset = args.includes('--reset')
  const isValidate = args.includes('--validate')

  try {
    console.log('='.repeat(50))
    console.log('🚀 ToTheMoon 数据库工具')
    console.log('='.repeat(50))

    if (isReset) {
      console.log('⚠️  正在重置数据库...')
      
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ 生产环境不允许重置数据库！')
        process.exit(1)
      }

      // 确认重置操作
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      })

      const answer = await new Promise<string>((resolve) => {
        readline.question('⚠️  确定要重置数据库吗？这将删除所有数据！(yes/no): ', resolve)
      })
      
      readline.close()

      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ 操作已取消')
        process.exit(0)
      }

      await resetDatabase()
      console.log('✅ 数据库重置完成！')
      
    } else if (isValidate) {
      console.log('🔍 正在验证数据库结构...')
      const isValid = await validateDatabase()
      
      if (isValid) {
        console.log('✅ 数据库结构验证通过！')
      } else {
        console.log('❌ 数据库结构验证失败！')
        process.exit(1)
      }
      
    } else {
      console.log('🔧 正在初始化数据库...')
      await initializeDatabase()
      console.log('✅ 数据库初始化完成！')
      
      // 验证初始化结果
      console.log('🔍 验证初始化结果...')
      const isValid = await validateDatabase()
      
      if (isValid) {
        console.log('✅ 验证通过！')
      } else {
        console.log('⚠️  验证有警告，请检查日志')
      }
    }

    // 显示数据库状态
    await showDatabaseStatus()
    
  } catch (error) {
    console.error('❌ 操作失败:', error)
    process.exit(1)
  } finally {
    // 关闭数据库连接
    await DatabaseClient.disconnect()
    console.log('📝 数据库连接已关闭')
  }
}

/**
 * 显示数据库状态信息
 */
async function showDatabaseStatus() {
  try {
    console.log('\n📊 数据库状态:')
    console.log('-'.repeat(30))

    const db = await DatabaseClient.getDb()
    
    // 获取所有集合
    const collections = await db.listCollections().toArray()
    console.log(`📁 集合数量: ${collections.length}`)
    
    // 显示每个集合的文档数量
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments()
      console.log(`   ${collection.name}: ${count} 个文档`)
    }

    // 数据库大小信息
    const stats = await db.stats()
    const sizeMB = (stats.dataSize / (1024 * 1024)).toFixed(2)
    console.log(`💾 数据大小: ${sizeMB} MB`)
    
    // 连接状态
    const connectionStatus = DatabaseClient.getConnectionStatus()
    console.log(`🔗 连接状态: ${connectionStatus.isConnected ? '已连接' : '未连接'}`)
    
  } catch (error) {
    console.error('获取数据库状态失败:', error)
  }
}

/**
 * 优雅关闭处理
 */
process.on('SIGINT', async () => {
  console.log('\n⚠️  接收到中断信号，正在关闭...')
  await DatabaseClient.disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n⚠️  接收到终止信号，正在关闭...')
  await DatabaseClient.disconnect()
  process.exit(0)
})

// 运行主函数
if (require.main === module) {
  main().catch(console.error)
}