import { NextRequest, NextResponse } from 'next/server'
import { templateRepository } from '@/lib/database/repositories'
import { generateBusinessId } from '@/lib/database/utils'
import { Template, isValidExchange } from '@/lib/database/schemas'

// GET /api/templates - 获取所有模板
export async function GET() {
  try {
    const rawTemplates = await templateRepository.find({}, { sort: { createdAt: -1 } })
    
    // 过滤掉旧的 status 和 runningStatus 字段
    const templates = rawTemplates.map(template => {
      const { status, runningStatus, ...cleanTemplate } = template as any
      return cleanTemplate
    })
    
    return NextResponse.json({ success: true, data: templates })
  } catch (error: any) {
    console.error('Failed to get templates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get templates' },
      { status: 500 }
    )
  }
}

// POST /api/templates - 创建新模板
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 验证必填字段
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: '模板名称不能为空' },
        { status: 400 }
      )
    }

    // 验证交易所是否在配置文件中
    if (!isValidExchange(body.activeControl?.exchange)) {
      return NextResponse.json(
        { success: false, error: `主动控制交易所 "${body.activeControl?.exchange}" 不在配置列表中` },
        { status: 400 }
      )
    }

    if (!isValidExchange(body.passiveControl?.exchange)) {
      return NextResponse.json(
        { success: false, error: `被动控制交易所 "${body.passiveControl?.exchange}" 不在配置列表中` },
        { status: 400 }
      )
    }
    
    // 创建新模板数据
    const templateData: Omit<Template, '_id' | 'createdAt' | 'updatedAt'> = {
      id: generateBusinessId('template'),
      name: body.name,
      activeControl: body.activeControl,
      passiveControl: body.passiveControl
    }
    
    const result = await templateRepository.insertOne(templateData)
    const rawTemplate = await templateRepository.findById(result.insertedId)
    
    // 过滤掉旧的 status 和 runningStatus 字段（虽然新创建的不应该有这些字段）
    const { status, runningStatus, ...template } = rawTemplate as any
    
    return NextResponse.json({ success: true, data: template }, { status: 201 })
  } catch (error) {
    console.error('Failed to create template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    )
  }
}