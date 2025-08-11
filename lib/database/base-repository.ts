import { Db, Collection, Filter, UpdateFilter, FindOptions, InsertOneResult, UpdateResult, DeleteResult, OptionalUnlessRequiredId } from 'mongodb'
import DatabaseClient from './client'

/**
 * 基础Repository类 - 提供通用的数据库操作方法
 */
export abstract class BaseRepository<T extends { _id?: any }> {
  protected db: Db
  protected collection: Collection<T>
  protected collectionName: string

  constructor(collectionName: string) {
    this.collectionName = collectionName
  }

  /**
   * 确保数据库连接和集合初始化
   */
  protected async ensureConnection(): Promise<void> {
    if (!this.db) {
      this.db = await DatabaseClient.getDb()
      this.collection = this.db.collection<T>(this.collectionName)
    }
  }

  /**
   * 插入单个文档
   */
  public async insertOne(document: OptionalUnlessRequiredId<T>): Promise<InsertOneResult<T>> {
    await this.ensureConnection()
    
    const now = new Date()
    const docWithTimestamps = {
      ...document,
      createdAt: (document as any).createdAt || now,
      updatedAt: now
    } as OptionalUnlessRequiredId<T>

    return await this.collection.insertOne(docWithTimestamps)
  }

  /**
   * 插入多个文档
   */
  public async insertMany(documents: OptionalUnlessRequiredId<T>[]): Promise<any> {
    await this.ensureConnection()
    
    const now = new Date()
    const docsWithTimestamps = documents.map(doc => ({
      ...doc,
      createdAt: (doc as any).createdAt || now,
      updatedAt: now
    })) as OptionalUnlessRequiredId<T>[]

    return await this.collection.insertMany(docsWithTimestamps)
  }

  /**
   * 根据ID查找单个文档
   */
  public async findById(id: any): Promise<T | null> {
    await this.ensureConnection()
    return await this.collection.findOne({ _id: id } as Filter<T>)
  }

  /**
   * 根据业务ID查找文档
   */
  public async findByBusinessId(id: string): Promise<T | null> {
    await this.ensureConnection()
    return await this.collection.findOne({ id } as Filter<T>)
  }

  /**
   * 查找单个文档
   */
  public async findOne(filter: Filter<T>, options?: FindOptions<T>): Promise<T | null> {
    await this.ensureConnection()
    return await this.collection.findOne(filter, options)
  }

  /**
   * 查找多个文档
   */
  public async find(filter: Filter<T> = {}, options?: FindOptions<T>): Promise<T[]> {
    await this.ensureConnection()
    return await this.collection.find(filter, options).toArray()
  }

  /**
   * 分页查询
   */
  public async findWithPagination(
    filter: Filter<T> = {},
    page: number = 1,
    limit: number = 10,
    options?: FindOptions<T>
  ): Promise<{ data: T[]; total: number; page: number; limit: number; totalPages: number }> {
    await this.ensureConnection()

    const skip = (page - 1) * limit
    const total = await this.collection.countDocuments(filter)
    
    const data = await this.collection
      .find(filter, options)
      .skip(skip)
      .limit(limit)
      .toArray()

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * 更新单个文档
   */
  public async updateOne(filter: Filter<T>, update: UpdateFilter<T>): Promise<UpdateResult<T>> {
    await this.ensureConnection()
    
    const updateWithTimestamp = {
      ...update,
      $set: {
        ...(update.$set || {}),
        updatedAt: new Date()
      }
    }

    return await this.collection.updateOne(filter, updateWithTimestamp)
  }

  /**
   * 根据ID更新文档
   */
  public async updateById(id: any, update: UpdateFilter<T>): Promise<UpdateResult<T>> {
    return await this.updateOne({ _id: id } as Filter<T>, update)
  }

  /**
   * 根据业务ID更新文档
   */
  public async updateByBusinessId(id: string, update: UpdateFilter<T>): Promise<UpdateResult<T>> {
    return await this.updateOne({ id } as Filter<T>, update)
  }

  /**
   * 更新多个文档
   */
  public async updateMany(filter: Filter<T>, update: UpdateFilter<T>): Promise<UpdateResult<T>> {
    await this.ensureConnection()
    
    const updateWithTimestamp = {
      ...update,
      $set: {
        ...(update.$set || {}),
        updatedAt: new Date()
      }
    }

    return await this.collection.updateMany(filter, updateWithTimestamp)
  }

  /**
   * 替换单个文档
   */
  public async replaceOne(filter: Filter<T>, replacement: T): Promise<UpdateResult<T>> {
    await this.ensureConnection()
    
    const replacementWithTimestamp = {
      ...replacement,
      updatedAt: new Date()
    }

    return await this.collection.replaceOne(filter, replacementWithTimestamp)
  }

  /**
   * 删除单个文档
   */
  public async deleteOne(filter: Filter<T>): Promise<DeleteResult> {
    await this.ensureConnection()
    return await this.collection.deleteOne(filter)
  }

  /**
   * 根据ID删除文档
   */
  public async deleteById(id: any): Promise<DeleteResult> {
    return await this.deleteOne({ _id: id } as Filter<T>)
  }

  /**
   * 根据业务ID删除文档
   */
  public async deleteByBusinessId(id: string): Promise<DeleteResult> {
    return await this.deleteOne({ id } as Filter<T>)
  }

  /**
   * 删除多个文档
   */
  public async deleteMany(filter: Filter<T>): Promise<DeleteResult> {
    await this.ensureConnection()
    return await this.collection.deleteMany(filter)
  }

  /**
   * 统计文档数量
   */
  public async count(filter: Filter<T> = {}): Promise<number> {
    await this.ensureConnection()
    return await this.collection.countDocuments(filter)
  }

  /**
   * 检查文档是否存在
   */
  public async exists(filter: Filter<T>): Promise<boolean> {
    await this.ensureConnection()
    const count = await this.collection.countDocuments(filter, { limit: 1 })
    return count > 0
  }

  /**
   * 原生集合操作（用于复杂查询）
   */
  public async getCollection(): Promise<Collection<T>> {
    await this.ensureConnection()
    return this.collection
  }

  /**
   * 事务操作
   */
  public async withTransaction<R>(
    operation: (session: any) => Promise<R>
  ): Promise<R> {
    const client = await DatabaseClient.getClient()
    const session = client.startSession()
    
    try {
      let result: R
      await session.withTransaction(async () => {
        result = await operation(session)
      })
      return result!
    } finally {
      await session.endSession()
    }
  }
}