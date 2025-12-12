import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail, generateVerificationCode } from '@/lib/aliyun-email'

// 验证码有效期（5分钟）
const CODE_EXPIRY_MINUTES = 5
// 发送间隔限制（1分钟）
const SEND_INTERVAL_SECONDS = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, type = 'login' } = body

    // 验证邮箱格式
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: '请输入有效的邮箱地址' },
        { status: 400 }
      )
    }

    // 检查发送频率限制（1分钟内只能发送一次）
    const recentCode = await prisma.verificationCode.findFirst({
      where: {
        email,
        createdAt: {
          gte: new Date(Date.now() - SEND_INTERVAL_SECONDS * 1000),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (recentCode) {
      const waitSeconds = Math.ceil(
        (SEND_INTERVAL_SECONDS * 1000 - (Date.now() - recentCode.createdAt.getTime())) / 1000
      )
      return NextResponse.json(
        { success: false, message: `请${waitSeconds}秒后再试` },
        { status: 429 }
      )
    }

    // 生成 6 位验证码
    const code = generateVerificationCode()

    // 计算过期时间
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000)

    // 保存验证码到数据库
    await prisma.verificationCode.create({
      data: {
        email,
        code,
        type,
        expiresAt,
      },
    })

    console.log(`📧 [SendCode] 验证码已生成: ${email} -> ${code}`)

    // 发送邮件
    const result = await sendVerificationEmail(email, code)

    if (!result.success) {
      // 如果邮件发送失败，删除刚创建的验证码记录
      await prisma.verificationCode.deleteMany({
        where: {
          email,
          code,
        },
      })

      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '验证码已发送，请查收邮件',
    })
  } catch (error) {
    console.error('发送验证码错误:', error)
    return NextResponse.json(
      { success: false, message: '发送验证码失败，请稍后重试' },
      { status: 500 }
    )
  }
}

