import { NextRequest, NextResponse } from 'next/server'
import { TemplateService } from '@/lib/services/template.service'

const templateService = new TemplateService()

// GET /api/templates - 获取所有模板
export async function GET() {
  try {
    const templates = await templateService.getAllTemplates()
    return NextResponse.json({ success: true, data: templates })
  } catch (error) {
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
    const template = await templateService.createTemplate(body)
    return NextResponse.json({ success: true, data: template }, { status: 201 })
  } catch (error) {
    console.error('Failed to create template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    )
  }
}