/**
 * 管理员认证工具
 */

import { NextRequest } from 'next/server'
import { verifyToken } from './auth-utils'
import { prisma } from './prisma'

export interface AdminAuthResult {
  success: boolean
  userId?: string
  message?: string
}

/**
 * 验证管理员权限
 */
export async function verifyAdmin(request: NextRequest): Promise<AdminAuthResult> {
  try {
    // 从 Header 中获取 Token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        message: '未提供认证令牌',
      }
    }

    const token = authHeader.substring(7)

    // 验证 Token
    const decoded = verifyToken(token)
    if (!decoded) {
      return {
        success: false,
        message: '无效的认证令牌',
      }
    }

    // 查询用户信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isBanned: true },
    })

    if (!user) {
      return {
        success: false,
        message: '用户不存在',
      }
    }

    if (user.isBanned) {
      return {
        success: false,
        message: '账号已被封禁',
      }
    }

    if (user.role !== 'admin') {
      return {
        success: false,
        message: '权限不足，需要管理员权限',
      }
    }

    return {
      success: true,
      userId: user.id,
    }
  } catch (error) {
    console.error('管理员认证错误:', error)
    return {
      success: false,
      message: '认证失败',
    }
  }
}

