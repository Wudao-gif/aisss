/**
 * 检查手机号是否已注册
 * POST /api/auth/check-phone
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone } = body

    // 验证手机号格式
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        {
          success: false,
          message: '请提供有效的手机号',
        },
        { status: 400 }
      )
    }

    // 查询用户是否存在
    const user = await prisma.user.findUnique({
      where: { phone },
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
    console.error('检查手机号失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: '检查手机号失败',
      },
      { status: 500 }
    )
  }
}

