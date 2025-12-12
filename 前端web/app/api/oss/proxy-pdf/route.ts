/**
 * PDF 文件代理 API
 * 解决 OSS CORS 问题：通过后端代理 PDF 文件请求
 * 支持 Range Request（分段请求），实现流式传输
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { generateSignedUrl } from '@/lib/oss'

export async function GET(request: NextRequest) {
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

    // 获取文件路径
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('filePath')

    console.log('📄 [PDF Proxy] 收到请求:', {
      filePath,
      url: request.url,
    })

    if (!filePath) {
      return NextResponse.json(
        { success: false, message: '请提供文件路径' },
        { status: 400 }
      )
    }

    // 生成签名 URL
    const signedUrl = await generateSignedUrl(filePath, 3600)
    console.log('📄 [PDF Proxy] 签名 URL:', signedUrl)

    // 获取客户端的 Range 请求头
    const rangeHeader = request.headers.get('range')

    // 构建请求头
    const fetchHeaders: HeadersInit = {}
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader
    }

    console.log('📄 [PDF Proxy] 开始从 OSS 获取文件...')

    // 从 OSS 获取文件
    const ossResponse = await fetch(signedUrl, {
      headers: fetchHeaders,
    })

    console.log('📄 [PDF Proxy] OSS 响应状态:', ossResponse.status, ossResponse.statusText)

    if (!ossResponse.ok) {
      console.error('从 OSS 获取文件失败:', ossResponse.status, ossResponse.statusText)
      return NextResponse.json(
        { success: false, message: '获取文件失败' },
        { status: ossResponse.status }
      )
    }

    // 获取响应头
    const contentType = ossResponse.headers.get('content-type') || 'application/pdf'
    const contentLength = ossResponse.headers.get('content-length')
    const contentRange = ossResponse.headers.get('content-range')
    const acceptRanges = ossResponse.headers.get('accept-ranges')

    // 构建响应头
    const responseHeaders: HeadersInit = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Authorization',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    }

    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength
    }

    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange
    }

    if (acceptRanges) {
      responseHeaders['Accept-Ranges'] = acceptRanges
    } else {
      responseHeaders['Accept-Ranges'] = 'bytes'
    }

    // 返回文件流
    return new NextResponse(ossResponse.body, {
      status: rangeHeader ? 206 : 200, // 206 Partial Content for range requests
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('代理 PDF 文件错误:', error)
    return NextResponse.json(
      { success: false, message: '获取文件失败' },
      { status: 500 }
    )
  }
}

// 处理 OPTIONS 请求（CORS 预检）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

