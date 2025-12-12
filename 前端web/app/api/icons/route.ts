import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/icons - 获取图标列表（公开接口）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const name = searchParams.get('name')

    // 构建查询条件
    const where: any = {}
    if (category) {
      where.category = category
    }
    if (name) {
      where.name = name
    }

    // 获取图标列表
    const icons = await prisma.iconResource.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: icons,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取图标列表错误:', error)
    return NextResponse.json(
      { success: false, message: '获取图标列表失败' },
      { status: 500 }
    )
  }
}

