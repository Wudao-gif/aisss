/**
 * 检查邮箱是否已注册
 * POST /api/auth/check-email
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // 验证邮箱
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: '请提供有效的邮箱地址',
        },
        { status: 400 }
      )
    }

    // 查询用户是否存在
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        isBanned: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        exists: !!user,
        isBanned: user?.isBanned || false,
      },
    })
  } catch (error) {
    console.error('检查邮箱失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: '检查邮箱失败',
      },
      { status: 500 }
    )
  }
}

