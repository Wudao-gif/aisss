/**
 * 客户端 - 图书文件下载 API
 * 检查 allowReading 权限后生成签名 URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'
import { generateSignedUrl } from '@/lib/oss'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 获取图书信息
    const { id } = await params
    const book = await prisma.book.findUnique({
      where: {
        id,
      },
      select: {
        fileUrl: true,
        allowReading: true,
        name: true,
      },
    })

    if (!book) {
      return NextResponse.json(
        { success: false, message: '图书不存在' },
        { status: 404 }
      )
    }

    if (!book.fileUrl) {
      return NextResponse.json(
        { success: false, message: '该图书没有上传文件' },
        { status: 404 }
      )
    }

    // 检查是否允许阅读
    if (!book.allowReading) {
      return NextResponse.json(
        { success: false, message: '该图书不支持在线阅读' },
        { status: 403 }
      )
    }

    // 生成签名 URL（1小时有效期）
    const signedUrl = generateSignedUrl(book.fileUrl, 3600)

    return NextResponse.json(
      {
        success: true,
        data: {
          url: signedUrl,
          fileName: book.name,
          expiresIn: 3600,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取图书文件错误:', error)
    return NextResponse.json(
      { success: false, message: '获取图书文件失败' },
      { status: 500 }
    )
  }
}

