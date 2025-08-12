import { NextResponse } from 'next/server'
import { getConfigPath } from '@/lib/config'

/**
 * 获取配置文件路径 API
 * GET /api/config/path
 */
export async function GET() {
  try {
    const path = getConfigPath()
    
    return NextResponse.json({
      success: true,
      data: {
        path
      }
    })
  } catch (error) {
    console.error('获取配置文件路径失败:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get config path'
    }, { status: 500 })
  }
}