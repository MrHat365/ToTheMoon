import { MongoClient, Db, MongoClientOptions } from 'mongodb'

/**
 * MongoDB数据库连接客户端 - 单例模式
 * 提供连接管理、健康检查、错误处理等功能
 */
class DatabaseClient {
  private static instance: DatabaseClient
  private client: MongoClient | null = null
  private db: Db | null = null
  private isConnecting: boolean = false

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient()
    }
    return DatabaseClient.instance
  }

  /**
   * 连接到MongoDB数据库
   */
  public async connect(): Promise<void> {
    if (this.client && this.db) {
      return // 已连接
    }

    if (this.isConnecting) {
      // 防止并发连接
      await this.waitForConnection()
      return
    }

    this.isConnecting = true

    try {
      // 构建连接字符串
      const host = process.env.MONGODB_HOST || 'localhost'
      const port = process.env.MONGODB_PORT || '27017'
      const username = process.env.MONGODB_USERNAME
      const password = process.env.MONGODB_PASSWORD
      const databaseName = process.env.MONGODB_DB || 'to_the_moon'
      
      let connectionString: string
      if (process.env.MONGODB_URI) {
        // 如果提供了完整的URI，直接使用
        connectionString = process.env.MONGODB_URI
      } else {
        // 否则根据配置构建URI
        if (username && password) {
          connectionString = `mongodb://${username}:${password}@${host}:${port}`
        } else {
          connectionString = `mongodb://${host}:${port}`
        }
      }

      const options: MongoClientOptions = {
        maxPoolSize: 10, // 连接池大小
        serverSelectionTimeoutMS: 5000, // 服务器选择超时
        socketTimeoutMS: 45000, // Socket超时
        connectTimeoutMS: 10000, // 连接超时
        family: 4, // 使用IPv4
        authSource: process.env.MONGODB_AUTH_DB || databaseName // 认证数据库
      }

      console.log(`正在连接MongoDB: ${connectionString}`)
      
      this.client = new MongoClient(connectionString, options)
      await this.client.connect()
      
      this.db = this.client.db(databaseName)
      
      // 验证连接
      await this.db.admin().ping()
      
      console.log(`MongoDB连接成功: ${databaseName}`)
    } catch (error) {
      console.error('MongoDB连接失败:', error)
      this.client = null
      this.db = null
      throw error
    } finally {
      this.isConnecting = false
    }
  }

  /**
   * 等待连接完成
   */
  private async waitForConnection(): Promise<void> {
    while (this.isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  /**
   * 获取数据库实例
   */
  public async getDb(): Promise<Db> {
    if (!this.db) {
      await this.connect()
    }
    
    if (!this.db) {
      throw new Error('数据库连接失败')
    }
    
    return this.db
  }

  /**
   * 获取MongoDB客户端实例
   */
  public async getClient(): Promise<MongoClient> {
    if (!this.client) {
      await this.connect()
    }
    
    if (!this.client) {
      throw new Error('MongoDB客户端连接失败')
    }
    
    return this.client
  }

  /**
   * 检查连接健康状态
   */
  public async isHealthy(): Promise<boolean> {
    try {
      if (!this.db) {
        return false
      }
      
      await this.db.admin().ping()
      return true
    } catch (error) {
      console.error('数据库健康检查失败:', error)
      return false
    }
  }

  /**
   * 重新连接数据库
   */
  public async reconnect(): Promise<void> {
    await this.disconnect()
    await this.connect()
  }

  /**
   * 断开数据库连接
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close()
        console.log('MongoDB连接已关闭')
      }
    } catch (error) {
      console.error('关闭MongoDB连接时出错:', error)
    } finally {
      this.client = null
      this.db = null
      this.isConnecting = false
    }
  }

  /**
   * 获取连接状态
   */
  public getConnectionStatus(): {
    isConnected: boolean
    isConnecting: boolean
    hasClient: boolean
    hasDatabase: boolean
  } {
    return {
      isConnected: !!(this.client && this.db),
      isConnecting: this.isConnecting,
      hasClient: !!this.client,
      hasDatabase: !!this.db
    }
  }
}

// 导出单例实例
export default DatabaseClient.getInstance()