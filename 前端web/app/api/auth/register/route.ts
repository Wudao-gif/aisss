import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth-utils'
import { getClientIpInfo } from '@/lib/ip-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, phone, password, realName, university, verificationCode } = body

    // 验证必填字段（邮箱或手机号至少一个）
    if (!email && !phone) {
      return NextResponse.json(
        { success: false, message: '请提供邮箱或手机号' },
        { status: 400 }
      )
    }

    // 验证邮箱格式（如果提供了邮箱）
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, message: '邮箱格式不正确' },
          { status: 400 }
        )
      }
    }

    // 验证手机号格式（如果提供了手机号）
    if (phone) {
      const phoneRegex = /^1[3-9]\d{9}$/
      if (!phoneRegex.test(phone)) {
        return NextResponse.json(
          { success: false, message: '手机号格式不正确' },
          { status: 400 }
        )
      }
    }

    // 验证密码长度（如果提供了密码）
    if (password && password.length < 8) {
      return NextResponse.json(
        { success: false, message: '密码长度至少为 8 位' },
        { status: 400 }
      )
    }

    // 验证验证码
    if (!verificationCode) {
      return NextResponse.json(
        { success: false, message: '请输入验证码' },
        { status: 400 }
      )
    }

    // 查找验证码记录（支持邮箱或手机号）
    const codeRecord = await prisma.verificationCode.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { phone: phone || undefined },
        ],
        code: verificationCode,
        isUsed: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!codeRecord) {
      return NextResponse.json(
        { success: false, message: '验证码错误' },
        { status: 400 }
      )
    }

    // 检查是否过期
    if (new Date() > codeRecord.expiresAt) {
      return NextResponse.json(
        { success: false, message: '验证码已失效，请重新获取' },
        { status: 400 }
      )
    }

    // 标记验证码为已使用
    await prisma.verificationCode.update({
      where: { id: codeRecord.id },
      data: { isUsed: true },
    })

    // 检查邮箱或手机号是否已存在
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })
      if (existingUser) {
        return NextResponse.json(
          { success: false, message: '该邮箱已被注册' },
          { status: 400 }
        )
      }
    }

    if (phone) {
      const existingUser = await prisma.user.findUnique({
        where: { phone },
      })
      if (existingUser) {
        return NextResponse.json(
          { success: false, message: '该手机号已被注册' },
          { status: 400 }
        )
      }
    }

    // 加密密码（如果提供了密码）
    const hashedPassword = password ? await hashPassword(password) : null

    // 获取客户端 IP 和城市信息
    const { ip, city } = await getClientIpInfo(request)

    // 生成默认用户名
    let defaultRealName = realName
    if (!defaultRealName) {
      if (phone) {
        // 手机号注册：游客_手机尾号4位
        defaultRealName = `游客_${phone.slice(-4)}`
      } else if (email) {
        // 邮箱注册：游客_邮箱前缀
        const emailPrefix = email.split('@')[0]
        defaultRealName = `游客_${emailPrefix}`
      }
    }

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email: email || null,
        phone: phone || null,
        password: hashedPassword,
        realName: defaultRealName || null,
        university: university || null,
        lastLoginIp: ip,
        lastLoginCity: city,
      },
    })

    // 生成 Token
    const identifier = user.email || user.phone || ''
    const token = generateToken(user.id, identifier, user.role)

    // 返回成功响应（不包含密码）
    return NextResponse.json(
      {
        success: true,
        message: '注册成功',
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            realName: user.realName,
            university: user.university,
            isBanned: user.isBanned,
          },
          token,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('注册错误:', error)
    return NextResponse.json(
      { success: false, message: '注册失败，请稍后重试' },
      { status: 500 }
    )
  }
}

