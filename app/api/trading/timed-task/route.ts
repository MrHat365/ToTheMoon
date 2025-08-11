import { NextRequest, NextResponse } from 'next/server'
import { TradingService } from '@/lib/services/trading.service'
import { TemplateService } from '@/lib/services/template.service'

const tradingService = new TradingService()
const templateService = new TemplateService()

// POST /api/trading/timed-task - 开启/停止定时任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { templateId, controlType, action, config } = body

    // 验证必需参数
    if (!templateId || !controlType || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    if (action === 'start') {
      // 如果提供了配置，先更新配置
      if (config) {
        await templateService.updateTimedTaskConfig(templateId, controlType, config)
      }
      
      await tradingService.startTimedTask(templateId, controlType)
      return NextResponse.json({ 
        success: true, 
        message: `Timed task started for ${controlType} control` 
      })
      
    } else if (action === 'stop') {
      await tradingService.stopTimedTask(templateId, controlType)
      return NextResponse.json({ 
        success: true, 
        message: `Timed task stopped for ${controlType} control` 
      })
      
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "start" or "stop"' },
        { status: 400 }
      )
    }

  } catch (error: any) {
    console.error('Failed to manage timed task:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to manage timed task' },
      { status: 500 }
    )
  }
}

// PUT /api/trading/timed-task - 更新定时任务配置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { templateId, controlType, config } = body

    // 验证必需参数
    if (!templateId || !controlType || !config) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const updatedTemplate = await templateService.updateTimedTaskConfig(
      templateId, 
      controlType, 
      config
    )

    if (!updatedTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedTemplate 
    })

  } catch (error: any) {
    console.error('Failed to update timed task config:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update timed task config' },
      { status: 500 }
    )
  }
}