/**
 * 书架资源管理 API
 * 获取书架中某本书的资源列表
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'
import { processUploadedDocument } from '@/lib/ai-service'
import { getOssPathFromUrl } from '@/lib/oss'

// 获取书架项的资源列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookshelfItemId: string }> }
) {
  try {
    // 从 Header 中获取 Token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '未提供认证令牌' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 验证 Token
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: '无效的认证令牌' },
        { status: 401 }
      )
    }

    const { bookshelfItemId } = await params

    // 检查书架项是否存在且属于当前用户
    const bookshelfItem = await prisma.bookshelfItem.findUnique({
      where: { id: bookshelfItemId },
    })

    if (!bookshelfItem) {
      return NextResponse.json(
        { success: false, message: '书架项不存在' },
        { status: 404 }
      )
    }

    if (bookshelfItem.userId !== decoded.userId) {
      return NextResponse.json(
        { success: false, message: '无权访问此书架项' },
        { status: 403 }
      )
    }

    // 获取资源列表
    const resources = await prisma.bookshelfResource.findMany({
      where: {
        bookshelfItemId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: resources,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取书架资源列表错误:', error)
    return NextResponse.json(
      { success: false, message: '获取资源列表失败' },
      { status: 500 }
    )
  }
}

// 用户上传私有资源到书架
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookshelfItemId: string }> }
) {
  try {
    // 从 Header 中获取 Token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '未提供认证令牌' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 验证 Token
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: '无效的认证令牌' },
        { status: 401 }
      )
    }

    const { bookshelfItemId } = await params
    const body = await request.json()
    const { name, description, fileUrl, fileType, fileSize } = body

    // 验证必填字段
    if (!name || !fileUrl || !fileType || !fileSize) {
      return NextResponse.json(
        { success: false, message: '请填写所有必填字段' },
        { status: 400 }
      )
    }

    // 检查书架项是否存在且属于当前用户
    const bookshelfItem = await prisma.bookshelfItem.findUnique({
      where: { id: bookshelfItemId },
    })

    if (!bookshelfItem) {
      return NextResponse.json(
        { success: false, message: '书架项不存在' },
        { status: 404 }
      )
    }

    if (bookshelfItem.userId !== decoded.userId) {
      return NextResponse.json(
        { success: false, message: '无权访问此书架项' },
        { status: 403 }
      )
    }

    // 使用事务创建用户上传资源记录和书架资源记录
    const result = await prisma.$transaction(async (tx) => {
      // 1. 先创建永久的用户上传资源记录（只有管理员可以删除）
      const userUploadedResource = await tx.userUploadedResource.create({
        data: {
          userId: decoded.userId,
          name,
          description: description || null,
          fileUrl,
          fileType,
          fileSize,
          allowReading: true,
        },
      })

      // 2. 创建书架资源记录（引用用户上传资源）
      const bookshelfResource = await tx.bookshelfResource.create({
        data: {
          bookshelfItemId,
          resourceId: null, // 用户上传的资源没有官方 resourceId
          userUploadedResourceId: userUploadedResource.id, // 引用用户上传资源
          userId: decoded.userId,
          name,
          description: description || null,
          fileUrl,
          fileType,
          fileSize,
          allowReading: true,
          isUserUploaded: true, // 标记为用户上传
        },
      })

      return { userUploadedResource, bookshelfResource }
    })

    // 触发 AI 处理（向量化资源文件）
    const ossPath = getOssPathFromUrl(fileUrl)
    if (ossPath) {
      processUploadedDocument(ossPath, {
        resource_id: result.bookshelfResource.id,  // 使用书架资源 ID
        book_id: bookshelfItem.bookId,  // 关联教材 ID
        name: name,
        type: 'user_resource',
      }).catch(err => {
        console.error('❌ [AI Service] 用户资源文件处理失败:', err)
      })
      console.log('🤖 [用户上传资源] 已提交 AI 处理任务:', ossPath, '| resourceId:', result.bookshelfResource.id)
    }

    return NextResponse.json(
      {
        success: true,
        message: '资源上传成功',
        data: result.bookshelfResource,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ 上传资源错误:', error)
    console.error('❌ 错误详情:', error instanceof Error ? error.message : String(error))
    console.error('❌ 错误堆栈:', error instanceof Error ? error.stack : '')
    return NextResponse.json(
      {
        success: false,
        message: '上传资源失败',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

