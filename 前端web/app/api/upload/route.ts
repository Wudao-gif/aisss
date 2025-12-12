/**
 * 文件上传 API
 * 支持图片和文档上传到阿里云 OSS
 * 支持管理员和普通用户上传
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { uploadToOSS, getFileType } from '@/lib/oss'

// 配置 Route Handler - 禁用默认的 body parser，允许大文件上传
export const runtime = 'nodejs' // 使用 Node.js 运行时
export const maxDuration = 300 // 最大执行时间 5 分钟（用于大文件上传）

// Next.js 14+ App Router 的请求体大小配置
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // 验证用户登录（管理员或普通用户）
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json(
      { success: false, message: '请先登录' },
      { status: 401 }
    )
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return NextResponse.json(
      { success: false, message: '登录已过期，请重新登录' },
      { status: 401 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'uploads'
    const isPublicStr = (formData.get('isPublic') as string) || 'false'
    const isPublic = isPublicStr === 'true'

    console.log('📤 [上传] 接收到文件:', {
      name: file?.name,
      size: file?.size,
      type: file?.type,
      folder,
      isPublic
    })

    if (!file) {
      return NextResponse.json(
        { success: false, message: '请选择文件' },
        { status: 400 }
      )
    }

    // 文件大小不限制（已移除 100MB 限制）
    // 注意：阿里云 OSS 单个文件最大支持 5GB
    console.log('📊 [上传] 文件大小:', (file.size / 1024 / 1024).toFixed(2), 'MB')

    // 验证文件类型
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/markdown',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: '不支持的文件类型' },
        { status: 400 }
      )
    }

    // 转换文件为 Buffer
    console.log('🔄 [上传] 开始转换文件为 Buffer...')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('✅ [上传] Buffer 转换完成，大小:', buffer.length, 'bytes')

    // 上传到 OSS
    // isPublic = true: 上传到公共 Bucket（封面、图标）
    // isPublic = false: 上传到私有 Bucket（图书文件、资源）
    console.log('☁️ [上传] 开始上传到 OSS...')
    const result = await uploadToOSS(buffer, file.name, folder, isPublic)
    console.log('✅ [上传] OSS 上传成功:', result)

    // AI 处理已移至图书创建/更新 API，确保有 bookId
    // 上传时只返回文件信息，不触发 AI 处理

    return NextResponse.json(
      {
        success: true,
        message: '文件上传成功',
        data: {
          url: result.url,
          size: result.size,
          type: getFileType(file.name),
          name: file.name,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('文件上传错误:', error)
    console.error('错误详情:', error instanceof Error ? error.message : String(error))
    console.error('错误堆栈:', error instanceof Error ? error.stack : '')
    return NextResponse.json(
      {
        success: false,
        message: '文件上传失败',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

