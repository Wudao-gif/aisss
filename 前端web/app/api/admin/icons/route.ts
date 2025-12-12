import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// GET /api/admin/icons - 获取图标列表
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '未授权' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: '需要管理员权限' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // 构建查询条件
    const where: any = {}
    if (category && category !== 'all') {
      where.category = category
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

// POST /api/admin/icons - 创建图标
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '未授权' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: '需要管理员权限' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, category, iconUrl } = body

    // 验证必填字段
    if (!name || !category || !iconUrl) {
      return NextResponse.json(
        { success: false, message: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 创建图标记录
    const icon = await prisma.iconResource.create({
      data: {
        name,
        category,
        iconUrl,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: '图标创建成功',
        data: icon,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('创建图标错误:', error)
    return NextResponse.json(
      { success: false, message: '创建图标失败' },
      { status: 500 }
    )
  }
}

