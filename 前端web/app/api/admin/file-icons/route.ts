import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// 验证管理员权限
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, message: '未授权' }
  }

  const token = authHeader.substring(7)
  const decoded = verifyToken(token)

  if (!decoded || decoded.role !== 'admin') {
    return { success: false, message: '需要管理员权限' }
  }

  return { success: true }
}

// GET /api/admin/file-icons - 获取所有文件图标
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [文件图标API] 开始处理GET请求')

    const authResult = await verifyAdmin(request)
    console.log('🔐 [文件图标API] 权限验证结果:', authResult)

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: 401 }
      )
    }

    console.log('📊 [文件图标API] 开始查询数据库')
    const fileIcons = await prisma.fileIcon.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    console.log(`✅ [文件图标API] 查询成功，找到 ${fileIcons.length} 个图标`)

    return NextResponse.json({
      success: true,
      data: fileIcons
    })
  } catch (error: any) {
    console.error('❌ [文件图标API] 获取文件图标列表失败:', error)
    console.error('错误详情:', error.message)
    console.error('错误堆栈:', error.stack)
    return NextResponse.json(
      { success: false, message: `获取文件图标列表失败: ${error.message}` },
      { status: 500 }
    )
  }
}

// POST /api/admin/file-icons - 创建文件图标
export async function POST(request: NextRequest) {
  const authResult = await verifyAdmin(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { name, extensions, iconUrl, isDefault, sortOrder } = body

    if (!name || !iconUrl) {
      return NextResponse.json(
        { success: false, message: '请提供图标名称和图标URL' },
        { status: 400 }
      )
    }

    // 如果设置为默认图标，先取消其他默认图标
    if (isDefault) {
      await prisma.fileIcon.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      })
    }

    const fileIcon = await prisma.fileIcon.create({
      data: {
        name,
        extensions: extensions || '',
        iconUrl,
        isDefault: isDefault || false,
        sortOrder: sortOrder || 0
      }
    })

    return NextResponse.json({
      success: true,
      message: '文件图标创建成功',
      data: fileIcon
    }, { status: 201 })
  } catch (error) {
    console.error('创建文件图标失败:', error)
    return NextResponse.json(
      { success: false, message: '创建文件图标失败' },
      { status: 500 }
    )
  }
}

