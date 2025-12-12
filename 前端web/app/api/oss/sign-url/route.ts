/**
 * OSS 签名 URL API
 * 为私有文件生成临时访问链接
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { generateSignedUrl } from '@/lib/oss'

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
    const { filePath, expiresIn = 3600 } = body

    if (!filePath) {
      return NextResponse.json(
        { success: false, message: '请提供文件路径' },
        { status: 400 }
      )
    }

    // 生成签名 URL
    const signedUrl = await generateSignedUrl(filePath, expiresIn)

    return NextResponse.json(
      {
        success: true,
        data: {
          url: signedUrl,
          expiresIn,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('生成签名 URL 错误:', error)
    return NextResponse.json(
      { success: false, message: '生成访问链接失败' },
      { status: 500 }
    )
  }
}

