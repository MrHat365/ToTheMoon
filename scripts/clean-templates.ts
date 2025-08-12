import dotenv from 'dotenv'
import DatabaseClient from '@/lib/database/client'
import { COLLECTIONS } from '@/lib/database/schemas'

// 加载环境变量
dotenv.config()

async function cleanTemplateData() {
  try {
    console.log('🚀 开始清理Template相关数据...')
    
    const db = await DatabaseClient.getDb()
    
    // 删除所有模板数据
    const templatesCollection = db.collection(COLLECTIONS.TEMPLATES)
    const templateDeleteResult = await templatesCollection.deleteMany({})
    console.log(`🧹 已删除 ${templateDeleteResult.deletedCount} 条Template数据`)
    
    // 删除所有定时任务配置数据
    const timedTasksCollection = db.collection(COLLECTIONS.TIMED_TASK_CONFIGS)
    const timedTaskDeleteResult = await timedTasksCollection.deleteMany({})
    console.log(`🧹 已删除 ${timedTaskDeleteResult.deletedCount} 条定时任务配置数据`)
    
    console.log('🎉 Template相关数据清理完成!')
    
  } catch (error) {
    console.error('❌ 清理失败:', error)
    process.exit(1)
  } finally {
    await DatabaseClient.disconnect()
  }
}

cleanTemplateData()