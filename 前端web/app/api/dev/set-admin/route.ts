import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 临时开发接口：设置用户为管理员
 * 仅用于开发环境，生产环境应该删除此文件
 */
export async function POST(request: NextRequest) {
  try {
    // 仅在开发环境可用
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, message: '此接口仅在开发环境可用' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { success: false, message: '请提供用户邮箱' },
        { status: 400 }
      )
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    // 更新用户角色为管理员
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'admin' }
    })

    return NextResponse.json({
      success: true,
      message: `用户 ${email} 已设置为管理员`,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        realName: updatedUser.realName,
        role: updatedUser.role
      }
    })
  } catch (error) {
    console.error('设置管理员失败:', error)
    return NextResponse.json(
      { success: false, message: '设置管理员失败' },
      { status: 500 }
    )
  }
}

