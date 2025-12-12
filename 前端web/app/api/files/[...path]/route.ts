/**
 * 文件访问API
 * 为OSS私有文件生成签名URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl } from '@/lib/oss'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params

    // 获取文件路径
    const filePath = path.join('/')

    if (!filePath) {
      return NextResponse.json(
        { success: false, message: '文件路径不能为空' },
        { status: 400 }
      )
    }

    // 生成签名URL（有效期1小时）
    const signedUrl = await generateSignedUrl(filePath, 3600)

    // 重定向到签名URL
    return NextResponse.redirect(signedUrl)
  } catch (error) {
    console.error('获取文件签名URL失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: '获取文件失败',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

