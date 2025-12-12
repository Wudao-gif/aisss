import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/file-icons - 获取所有文件图标（公开接口）
export async function GET(request: NextRequest) {
  try {
    const fileIcons = await prisma.fileIcon.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        name: true,
        extensions: true,
        iconUrl: true,
        isDefault: true
      }
    })

    return NextResponse.json({
      success: true,
      data: fileIcons
    })
  } catch (error) {
    console.error('获取文件图标列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取文件图标列表失败' },
      { status: 500 }
    )
  }
}

