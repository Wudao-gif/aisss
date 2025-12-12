import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth-utils'
import { getClientIpInfo } from '@/lib/ip-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, phone, password, verificationCode, loginMethod } = body

    // 验证必填字段（邮箱或手机号至少一个）
    if (!email && !phone) {
      return NextResponse.json(
        { success: false, message: '请输入邮箱或手机号' },
        { status: 400 }
      )
    }

    // 查找用户（根据邮箱或手机号）
    let user
    if (email) {
      user = await prisma.user.findUnique({
        where: { email },
      })
    } else if (phone) {
      user = await prisma.user.findUnique({
        where: { phone },
      })
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: email ? '该邮箱未注册' : '该手机号未注册' },
        { status: 400 }
      )
    }

    // 检查用户是否被封禁
    if (user.isBanned) {
      return NextResponse.json(
        { success: false, message: '该账号已被封禁' },
        { status: 403 }
      )
    }

    // 根据登录方式验证
    if (loginMethod === 'password') {
      // 密码登录
      if (!password) {
        return NextResponse.json(
          { success: false, message: '请输入密码' },
          { status: 400 }
        )
      }

      if (!user.password) {
        return NextResponse.json(
          { success: false, message: '该账号未设置密码，请使用验证码登录' },
          { status: 400 }
        )
      }

      const isPasswordValid = await verifyPassword(password, user.password)
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, message: '密码错误' },
          { status: 400 }
        )
      }
    } else if (loginMethod === 'verification') {
      // 验证码登录
      if (!verificationCode) {
        return NextResponse.json(
          { success: false, message: '请输入验证码' },
          { status: 400 }
        )
      }

      // 验证验证码（支持邮箱或手机号）
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
    } else {
      return NextResponse.json(
        { success: false, message: '无效的登录方式' },
        { status: 400 }
      )
    }

    // 生成 Token（使用邮箱或手机号作为标识）
    const identifier = user.email || user.phone || ''
    const token = generateToken(user.id, identifier, user.role)

    // 获取客户端 IP 和城市信息（异步，不阻塞登录）
    getClientIpInfo(request).then(async ({ ip, city }) => {
      if (ip) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginIp: ip,
              lastLoginCity: city,
            },
          })
        } catch (err) {
          console.warn('更新用户 IP 信息失败:', err)
        }
      }
    })

    // 返回成功响应（不包含密码）
    return NextResponse.json(
      {
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            realName: user.realName,
            avatar: user.avatar,
            university: user.university,
            role: user.role,
            isBanned: user.isBanned,
            wechatOpenId: user.wechatOpenId,
          },
          token,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('登录错误:', error)
    return NextResponse.json(
      { success: false, message: '登录失败，请稍后重试' },
      { status: 500 }
    )
  }
}

