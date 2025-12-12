import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // 从 Header 中获取 Token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '未提供认证令牌' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // 移除 "Bearer " 前缀

    // 验证 Token
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: '无效的认证令牌' },
        { status: 401 }
      )
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    // 检查用户是否被封禁
    if (user.isBanned) {
      return NextResponse.json(
        { success: false, message: '该账号已被封禁' },
        { status: 403 }
      )
    }

    // 返回用户信息（不包含密码）
    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          realName: user.realName,
          avatar: user.avatar,
          university: user.university,
          role: user.role,
          isBanned: user.isBanned,
          wechatOpenId: user.wechatOpenId,
          createdAt: user.createdAt,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取用户信息错误:', error)
    return NextResponse.json(
      { success: false, message: '获取用户信息失败' },
      { status: 500 }
    )
  }
}

