import { NextRequest, NextResponse } from 'next/server'

// 定时任务配置接口
interface TimedTaskConfig {
  minSize: number
  maxSize: number
  minTime: number // 秒
  maxTime: number // 秒
  tradeSide: 'buy' | 'sell'
  orderType: 'GTC_LIMIT' | 'IOC_LIMIT' | 'MARKET'
  orderBookLevel: number
  eatLimit?: number // 主动控制特有
  maxTradeAmount: number
  amountType: 'USDT' | 'TOKEN'
  selectedAccountIds: string[]
}

// 定时任务请求接口
interface TimedTaskRequest {
  templateId: string
  controlType: 'active' | 'passive'
  action: 'start' | 'stop'
  config?: TimedTaskConfig
}

// 定时任务状态
interface TimedTaskStatus {
  taskId: string
  templateId: string
  controlType: 'active' | 'passive'
  isRunning: boolean
  config: TimedTaskConfig
  statistics: {
    totalOrders: number
    successfulOrders: number
    failedOrders: number
    totalVolume: number
    averagePrice: number
    runningTime: number // 运行时间（秒）
  }
  startTime?: string
  lastExecutionTime?: string
  nextExecutionTime?: string
}

// API响应接口
interface TimedTaskResponse {
  success: boolean
  message: string
  data?: TimedTaskStatus
  error?: string
}

// 存储正在运行的定时任务
const runningTasks = new Map<string, TimedTaskStatus>()

// POST /api/trading/timed-task - 开启/停止定时任务
export async function POST(request: NextRequest) {
  try {
    const body: TimedTaskRequest = await request.json()
    
    // 验证必填字段
    if (!body.templateId || !body.controlType || !body.action) {
      return NextResponse.json({
        success: false,
        message: '缺少必填参数',
        error: '请检查 templateId, controlType, action 参数'
      } as TimedTaskResponse, { status: 400 })
    }
    
    const taskKey = `${body.templateId}_${body.controlType}`
    
    if (body.action === 'start') {
      // 验证配置参数
      if (!body.config) {
        return NextResponse.json({
          success: false,
          message: '启动定时任务需要配置参数',
          error: '请提供定时任务配置'
        } as TimedTaskResponse, { status: 400 })
      }
      
      if (body.config.selectedAccountIds.length === 0) {
        return NextResponse.json({
          success: false,
          message: '未选择交易账户',
          error: '请至少选择一个交易账户'
        } as TimedTaskResponse, { status: 400 })
      }
      
      // 检查是否已有任务在运行
      if (runningTasks.has(taskKey)) {
        return NextResponse.json({
          success: false,
          message: '定时任务已在运行',
          error: '请先停止当前任务再启动新任务'
        } as TimedTaskResponse, { status: 409 })
      }
      
      // 生成任务ID
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 创建定时任务状态
      const taskStatus: TimedTaskStatus = {
        taskId,
        templateId: body.templateId,
        controlType: body.controlType,
        isRunning: true,
        config: body.config,
        statistics: {
          totalOrders: 0,
          successfulOrders: 0,
          failedOrders: 0,
          totalVolume: 0,
          averagePrice: 0,
          runningTime: 0
        },
        startTime: new Date().toISOString(),
        lastExecutionTime: undefined,
        nextExecutionTime: new Date(Date.now() + Math.random() * (body.config.maxTime - body.config.minTime) * 1000 + body.config.minTime * 1000).toISOString()
      }
      
      runningTasks.set(taskKey, taskStatus)
      
      // 记录操作日志
      console.log('定时任务已启动:', {
        taskId,
        templateId: body.templateId,
        controlType: body.controlType,
        config: body.config
      })
      
      const response: TimedTaskResponse = {
        success: true,
        message: `定时任务已启动 (${body.controlType === 'active' ? '主动' : '被动'}控制)`,
        data: taskStatus
      }
      
      return NextResponse.json(response)
      
    } else if (body.action === 'stop') {
      const taskStatus = runningTasks.get(taskKey)
      
      if (!taskStatus) {
        return NextResponse.json({
          success: false,
          message: '未找到正在运行的定时任务',
          error: '该模板的定时任务未启动或已停止'
        } as TimedTaskResponse, { status: 404 })
      }
      
      // 停止定时任务
      taskStatus.isRunning = false
      taskStatus.statistics.runningTime = Math.floor((Date.now() - new Date(taskStatus.startTime!).getTime()) / 1000)
      
      // 从运行任务中移除
      runningTasks.delete(taskKey)
      
      // 记录操作日志
      console.log('定时任务已停止:', {
        taskId: taskStatus.taskId,
        templateId: body.templateId,
        controlType: body.controlType,
        runningTime: taskStatus.statistics.runningTime
      })
      
      const response: TimedTaskResponse = {
        success: true,
        message: `定时任务已停止 (${body.controlType === 'active' ? '主动' : '被动'}控制)`,
        data: taskStatus
      }
      
      return NextResponse.json(response)
      
    } else {
      return NextResponse.json({
        success: false,
        message: '无效的操作',
        error: '操作类型必须为 "start" 或 "stop"'
      } as TimedTaskResponse, { status: 400 })
    }
    
  } catch (error: any) {
    console.error('定时任务操作失败:', error)
    return NextResponse.json({
      success: false,
      message: '定时任务操作失败',
      error: error.message || '服务器内部错误'
    } as TimedTaskResponse, { status: 500 })
  }
}

// GET /api/trading/timed-task - 查询定时任务状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')
    const controlType = searchParams.get('controlType')
    
    if (!templateId || !controlType) {
      return NextResponse.json({
        success: false,
        error: '请提供 templateId 和 controlType 参数'
      }, { status: 400 })
    }
    
    const taskKey = `${templateId}_${controlType}`
    const taskStatus = runningTasks.get(taskKey)
    
    if (!taskStatus) {
      return NextResponse.json({
        success: true,
        message: '该定时任务未运行',
        data: null
      })
    }
    
    // 更新运行时间
    if (taskStatus.isRunning) {
      taskStatus.statistics.runningTime = Math.floor((Date.now() - new Date(taskStatus.startTime!).getTime()) / 1000)
      
      // 模拟更新统计数据
      if (Math.random() > 0.7) { // 30% 概率更新统计
        taskStatus.statistics.totalOrders += Math.floor(Math.random() * 3)
        taskStatus.statistics.successfulOrders = Math.floor(taskStatus.statistics.totalOrders * 0.9)
        taskStatus.statistics.failedOrders = taskStatus.statistics.totalOrders - taskStatus.statistics.successfulOrders
        taskStatus.statistics.totalVolume += Math.random() * 100
        taskStatus.statistics.averagePrice = 42000 + (Math.random() - 0.5) * 1000
        taskStatus.lastExecutionTime = new Date().toISOString()
        taskStatus.nextExecutionTime = new Date(Date.now() + Math.random() * (taskStatus.config.maxTime - taskStatus.config.minTime) * 1000 + taskStatus.config.minTime * 1000).toISOString()
      }
    }
    
    return NextResponse.json({
      success: true,
      data: taskStatus
    })
    
  } catch (error: any) {
    console.error('查询定时任务状态失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 })
  }
}

// PUT /api/trading/timed-task - 更新定时任务配置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { templateId, controlType, config }: { templateId: string, controlType: 'active' | 'passive', config: TimedTaskConfig } = body
    
    // 验证必填字段
    if (!templateId || !controlType || !config) {
      return NextResponse.json({
        success: false,
        message: '缺少必填参数',
        error: '请检查 templateId, controlType, config 参数'
      }, { status: 400 })
    }
    
    const taskKey = `${templateId}_${controlType}`
    const taskStatus = runningTasks.get(taskKey)
    
    if (taskStatus && taskStatus.isRunning) {
      return NextResponse.json({
        success: false,
        message: '无法更新正在运行的定时任务配置',
        error: '请先停止定时任务再更新配置'
      }, { status: 409 })
    }
    
    // 记录操作日志
    console.log('定时任务配置已更新:', {
      templateId,
      controlType,
      config
    })
    
    return NextResponse.json({
      success: true,
      message: '定时任务配置已更新',
      data: {
        templateId,
        controlType,
        config,
        updatedAt: new Date().toISOString()
      }
    })
    
  } catch (error: any) {
    console.error('更新定时任务配置失败:', error)
    return NextResponse.json({
      success: false,
      message: '更新定时任务配置失败',
      error: error.message || '服务器内部错误'
    }, { status: 500 })
  }
}