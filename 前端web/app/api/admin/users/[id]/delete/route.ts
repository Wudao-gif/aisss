/**
 * 管理后台 - 注销用户 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'

// 注销用户（删除用户及其所有数据）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 验证管理员权限
  const authResult = await verifyAdmin(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: 401 }
    )
  }

  try {
    const { id } = await params

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id },
      select: { 
        id: true, 
        role: true, 
        email: true, 
        phone: true,
        _count: {
          select: {
            bookshelf: true,
            conversations: true,
            plans: true,
          }
        }
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    // 不能注销管理员
    if (user.role === 'admin') {
      return NextResponse.json(
        { success: false, message: '不能注销管理员账号' },
        { status: 400 }
      )
    }

    // 删除用户（由于设置了 onDelete: Cascade，相关数据会自动删除）
    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json(
      {
        success: true,
        message: '用户已注销',
        data: {
          deletedUser: {
            id: user.id,
            email: user.email,
            phone: user.phone,
          },
          deletedData: {
            bookshelf: user._count.bookshelf,
            conversations: user._count.conversations,
            plans: user._count.plans,
          }
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('注销用户错误:', error)
    return NextResponse.json(
      { success: false, message: '注销用户失败' },
      { status: 500 }
    )
  }
}

