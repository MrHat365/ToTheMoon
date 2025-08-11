import { MongoClient, Db, Collection } from 'mongodb'

/**
 * 数据库连接管理器
 */
class DatabaseClient {
  private static instance: DatabaseClient
  private _client: MongoClient | null = null
  private _db: Db | null = null

  private constructor() {}

  static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient()
    }
    return DatabaseClient.instance
  }

  async connect(): Promise<void> {
    if (this._client) return

    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
    const dbName = process.env.MONGODB_DB_NAME || 'to_the_moon'

    try {
      this._client = new MongoClient(uri)
      await this._client.connect()
      this._db = this._client.db(dbName)
      console.log('✅ 数据库连接成功')
    } catch (error) {
      console.error('❌ 数据库连接失败:', error)
      throw error
    }
  }

  isConnected(): boolean {
    return !!this._client && !!this._db
  }

  getDb(): Db {
    if (!this._db) {
      throw new Error('数据库未连接，请先调用 connect()')
    }
    return this._db
  }

  getCollection(collectionName: string): Collection<any> {
    return this.getDb().collection(collectionName)
  }

  async close(): Promise<void> {
    if (this._client) {
      await this._client.close()
      this._client = null
      this._db = null
      console.log('数据库连接已关闭')
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this._db) return false
      await this._db.admin().ping()
      return true
    } catch (error) {
      console.error('数据库健康检查失败:', error)
      return false
    }
  }
}

/**
 * 全局数据库实例
 */
export const database = DatabaseClient.getInstance()

/**
 * 确保数据库连接的中间件函数
 */
export async function ensureDbConnection() {
  if (!database.isConnected()) {
    await database.connect()
  }
}

/**
 * 简化的数据库操作类
 */
export class SimpleRepository<T = any> {
  protected collection: Collection<any>
  
  constructor(collectionName: string) {
    this.collection = database.getCollection(collectionName)
  }

  async create(doc: any): Promise<T> {
    const result = await this.collection.insertOne(doc)
    const insertedDoc = await this.collection.findOne({ _id: result.insertedId })
    return insertedDoc as T
  }

  async findById(id: string): Promise<T | null> {
    return await this.collection.findOne({ _id: id } as any) as T | null
  }

  async findAll(filter: any = {}): Promise<T[]> {
    return await this.collection.find(filter).toArray() as T[]
  }

  async findOne(filter: any): Promise<T | null> {
    return await this.collection.findOne(filter) as T | null
  }

  async updateById(id: string, update: any): Promise<T | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: id } as any,
      { $set: update },
      { returnDocument: 'after' }
    )
    return result.value as T | null
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: id } as any)
    return result.deletedCount > 0
  }

  async count(filter: any = {}): Promise<number> {
    return await this.collection.countDocuments(filter)
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return await this.collection.aggregate(pipeline).toArray()
  }
}