import { NextRequest, NextResponse } from 'next/server'
import { templateRepository } from '@/lib/database/repositories'
import { isValidExchange } from '@/lib/database/schemas'

// GET /api/templates/[id] - 获取单个模板
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawTemplate = await templateRepository.findByBusinessId(params.id)
    
    if (!rawTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }
    
    // 过滤掉旧的 status 和 runningStatus 字段
    const { status, runningStatus, ...template } = rawTemplate as any
    
    return NextResponse.json({ success: true, data: template })
  } catch (error: any) {
    console.error('Failed to get template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get template' },
      { status: 500 }
    )
  }
}

// PUT /api/templates/[id] - 更新模板
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    // 验证交易所是否在配置文件中
    if (body.activeControl?.exchange && !isValidExchange(body.activeControl.exchange)) {
      return NextResponse.json(
        { success: false, error: `主动控制交易所 "${body.activeControl.exchange}" 不在配置列表中` },
        { status: 400 }
      )
    }

    if (body.passiveControl?.exchange && !isValidExchange(body.passiveControl.exchange)) {
      return NextResponse.json(
        { success: false, error: `被动控制交易所 "${body.passiveControl.exchange}" 不在配置列表中` },
        { status: 400 }
      )
    }
    
    // 构建更新数据
    const updateData = {
      name: body.name,
      activeControl: body.activeControl,
      passiveControl: body.passiveControl
    }
    
    const result = await templateRepository.updateByBusinessId(params.id, { $set: updateData })
    
    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }
    
    const rawUpdatedTemplate = await templateRepository.findByBusinessId(params.id)
    // 过滤掉旧的 status 和 runningStatus 字段
    const { status, runningStatus, ...updatedTemplate } = rawUpdatedTemplate as any
    
    return NextResponse.json({ success: true, data: updatedTemplate })
  } catch (error: any) {
    console.error('Failed to update template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

// DELETE /api/templates/[id] - 删除模板
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await templateRepository.deleteByBusinessId(params.id)
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}