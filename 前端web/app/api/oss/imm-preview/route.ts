/**
 * 阿里云 WebOffice 在线预览 API
 * 使用 OSS 的 doc/preview 功能
 * 支持水印、权限控制等高级功能
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { generateWebOfficeToken } from '@/lib/imm'

/**
 * 邮箱脱敏函数
 * 例如：324433@qq.com → 324***@qq.com
 *      abcdefg@gmail.com → abc***@gmail.com
 */
function maskEmail(email: string): string {
  const [username, domain] = email.split('@')
  if (!username || !domain) return email

  if (username.length <= 3) {
    return `${username[0]}***@${domain}`
  }
  return `${username.slice(0, 3)}***@${domain}`
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '未提供认证令牌' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: '无效的认证令牌' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      filePath,
      fileName, // 文件名（用于 IMM 显示）
      readonly = true, // 默认只读
      allowExport = false, // 默认禁止导出
      allowPrint = false, // 默认禁止打印
      allowCopy = true,
      watermarkText,
    } = body

    if (!filePath) {
      return NextResponse.json(
        { success: false, message: '请提供文件路径' },
        { status: 400 }
      )
    }

    // 获取当前登录用户的邮箱并脱敏
    const maskedEmail = maskEmail(decoded.email)

    console.log('📄 [IMM Preview] 用户信息:', {
      userId: decoded.userId,
      email: decoded.email,
      maskedEmail,
    })

    // 生成 WebOffice 预览凭证
    const result = await generateWebOfficeToken(filePath, {
      fileName, // 传递文件名
      permission: {
        readonly,
        print: allowPrint,
        copy: allowCopy,
        export: allowExport,
      },
      watermark: watermarkText ? {
        type: 1,
        value: watermarkText,
        fillStyle: 'rgba(192,192,192,0.6)',
        font: 'bold 20px Serif',
        rotate: -0.7854,
        horizontal: 50,
        vertical: 50,
      } : undefined,
      // 始终传递当前登录用户的脱敏邮箱
      user: {
        id: decoded.userId,
        name: maskedEmail, // 显示脱敏后的邮箱
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          accessToken: result.accessToken,
          webofficeURL: result.webofficeURL,
          refreshToken: result.refreshToken,
          accessTokenExpiredTime: result.accessTokenExpiredTime,
          refreshTokenExpiredTime: result.refreshTokenExpiredTime,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('生成 WebOffice 预览 URL 错误:', error)
    return NextResponse.json(
      { success: false, message: '生成预览链接失败' },
      { status: 500 }
    )
  }
}

