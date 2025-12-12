/**
 * 发送手机验证码 API
 * POST /api/auth/send-phone-code
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSmsVerificationCode, generateVerificationCode } from '@/lib/aliyun-sms'

// 验证码有效期（分钟）
const CODE_EXPIRY_MINUTES = 5
// 发送间隔（秒）
const SEND_INTERVAL_SECONDS = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, type = 'login' } = body

    // 验证手机号格式
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: '请输入有效的手机号' },
        { status: 400 }
      )
    }

    // 检查发送频率（1分钟内只能发送一次）
    const recentCode = await prisma.verificationCode.findFirst({
      where: {
        phone,
        channel: 'sms',
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

    // 生成验证码
    const code = generateVerificationCode()
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000)

    // 发送短信
    const result = await sendSmsVerificationCode(phone, code)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      )
    }

    // 保存验证码到数据库
    await prisma.verificationCode.create({
      data: {
        phone,
        code,
        type,
        channel: 'sms',
        expiresAt,
      },
    })

    console.log(`✅ [SendPhoneCode] 验证码已发送: ${phone.slice(0, 3)}****${phone.slice(-4)}`)

    return NextResponse.json({
      success: true,
      message: '验证码已发送，请查收短信',
    })
  } catch (error) {
    console.error('发送手机验证码失败:', error)
    return NextResponse.json(
      { success: false, message: '发送失败，请稍后重试' },
      { status: 500 }
    )
  }
}

