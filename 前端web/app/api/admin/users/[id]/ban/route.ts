/**
 * 管理后台 - 封禁/解封用户 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'

// 封禁/解封用户
export async function PATCH(
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
    const body = await request.json()
    const { isBanned } = body

    if (typeof isBanned !== 'boolean') {
      return NextResponse.json(
        { success: false, message: '参数错误' },
        { status: 400 }
      )
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    // 不能封禁管理员
    if (user.role === 'admin') {
      return NextResponse.json(
        { success: false, message: '不能封禁管理员账号' },
        { status: 400 }
      )
    }

    // 更新封禁状态
    await prisma.user.update({
      where: { id },
      data: { isBanned },
    })

    return NextResponse.json(
      {
        success: true,
        message: isBanned ? '用户已封禁' : '用户已解封',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('封禁/解封用户错误:', error)
    return NextResponse.json(
      { success: false, message: '操作失败' },
      { status: 500 }
    )
  }
}

