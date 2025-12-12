import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, phone, code } = body

    // 验证必填字段：必须提供邮箱或手机号
    if (!email && !phone) {
      return NextResponse.json(
        { success: false, message: '请输入邮箱或手机号' },
        { status: 400 }
      )
    }

    if (!code) {
      return NextResponse.json(
        { success: false, message: '请输入验证码' },
        { status: 400 }
      )
    }

    // 验证验证码格式（6位数字）
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, message: '验证码格式错误' },
        { status: 400 }
      )
    }

    // 构建查询条件
    const whereCondition = email
      ? { email, code, isUsed: false }
      : { phone, code, isUsed: false }

    // 查找验证码记录
    const verificationCode = await prisma.verificationCode.findFirst({
      where: whereCondition,
      orderBy: {
        createdAt: 'desc',
      },
    })

    // 验证码不存在
    if (!verificationCode) {
      // 检查是否有该邮箱/手机号的任何验证码记录
      const anyCodeWhere = email ? { email } : { phone }
      const anyCode = await prisma.verificationCode.findFirst({
        where: anyCodeWhere,
        orderBy: { createdAt: 'desc' },
      })

      if (!anyCode) {
        return NextResponse.json(
          { success: false, message: '请先获取验证码' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { success: false, message: '验证码错误' },
        { status: 400 }
      )
    }

    // 检查是否过期
    if (new Date() > verificationCode.expiresAt) {
      return NextResponse.json(
        { success: false, message: '验证码已失效，请重新获取' },
        { status: 400 }
      )
    }

    // 注意：这里不标记为已使用，让 register API 来标记
    // 这样可以避免验证码在注册前就被标记为已使用的问题

    const identifier = email || phone
    console.log(`✅ [VerifyCode] 验证码验证成功: ${identifier}`)

    return NextResponse.json({
      success: true,
      message: '验证成功',
    })
  } catch (error) {
    console.error('验证验证码错误:', error)
    return NextResponse.json(
      { success: false, message: '验证失败，请稍后重试' },
      { status: 500 }
    )
  }
}

