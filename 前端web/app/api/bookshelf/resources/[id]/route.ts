/**
 * 书架资源移除 API
 * 用户可以移除资源（只解除绑定关系），不删除源文件和后台数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// 移除书架资源
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 从 Header 中获取 Token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '未提供认证令牌' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 验证 Token
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: '无效的认证令牌' },
        { status: 401 }
      )
    }

    const { id } = await params

    // 检查资源是否存在
    const resource = await prisma.bookshelfResource.findUnique({
      where: { id },
    })

    if (!resource) {
      return NextResponse.json(
        { success: false, message: '资源不存在' },
        { status: 404 }
      )
    }

    // 检查是否是用户自己的资源
    if (resource.userId !== decoded.userId) {
      return NextResponse.json(
        { success: false, message: '无权删除此资源' },
        { status: 403 }
      )
    }

    // 删除数据库记录（解除绑定关系）
    // 注意：不删除 OSS 文件，保留源文件供后台管理
    // 官方资源：BookResource 记录仍然存在
    // 用户上传资源：OSS 文件仍然存在，后台可以通过其他方式管理
    await prisma.bookshelfResource.delete({
      where: { id },
    })

    return NextResponse.json(
      {
        success: true,
        message: '资源移除成功',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('删除资源错误:', error)
    return NextResponse.json(
      { success: false, message: '删除资源失败' },
      { status: 500 }
    )
  }
}

