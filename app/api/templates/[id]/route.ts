import { NextRequest, NextResponse } from 'next/server'
import { TemplateService } from '@/lib/services/template.service'

const templateService = new TemplateService()

// GET /api/templates/[id] - 获取单个模板
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await templateService.getTemplate(params.id)
    const templateData = { template }
    
    if (!templateData.template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, data: templateData })
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
    const template = await templateService.updateTemplate(params.id, body)
    
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, data: template })
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
    const success = await templateService.deleteTemplate(params.id)
    
    if (!success) {
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