/**
 * 管理后台 - 图书管理 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'
import { processUploadedDocument } from '@/lib/ai-service'
import { getOssPathFromUrl } from '@/lib/oss'

// 获取图书列表
export async function GET(request: NextRequest) {
  // 验证管理员权限
  const authResult = await verifyAdmin(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    // 构建查询条件
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { isbn: { contains: search, mode: 'insensitive' } },
      ]
    }

    // 获取总数
    const total = await prisma.book.count({ where })

    // 获取图书列表
    const books = await prisma.book.findMany({
      where,
      include: {
        _count: {
          select: {
            bookshelf: true,
            resources: true,  // 关系字段名是 resources
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          books,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取图书列表错误:', error)
    return NextResponse.json(
      { success: false, message: '获取图书列表失败' },
      { status: 500 }
    )
  }
}

// 创建图书
export async function POST(request: NextRequest) {
  // 验证管理员权限
  const authResult = await verifyAdmin(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { name, author, isbn, publisher, coverUrl, fileUrl, fileSize, allowReading } = body

    // 验证必填字段
    if (!name || !author || !isbn || !publisher) {
      return NextResponse.json(
        { success: false, message: '请填写所有必填字段' },
        { status: 400 }
      )
    }

    // 检查 ISBN 是否已存在
    const existingBook = await prisma.book.findUnique({
      where: { isbn },
    })

    if (existingBook) {
      return NextResponse.json(
        { success: false, message: 'ISBN 已存在' },
        { status: 400 }
      )
    }

    // 创建图书
    const book = await prisma.book.create({
      data: {
        name,
        author,
        isbn,
        publisher,
        coverUrl: coverUrl || null,
        fileUrl: fileUrl || null,
        fileSize: fileSize || null,
        allowReading: allowReading || false,
      },
    })

    // 如果有图书文件，触发 AI 处理（异步，不阻塞响应）
    if (fileUrl) {
      const ossPath = getOssPathFromUrl(fileUrl)
      if (ossPath) {
        processUploadedDocument(ossPath, {
          book_id: book.id,
          name: book.name,
          type: 'book',
        }).catch(err => {
          console.error('❌ [AI Service] 图书文件处理失败:', err)
        })
        console.log('🤖 [创建图书] 已提交 AI 处理任务:', ossPath, '| bookId:', book.id)
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: '图书创建成功',
        data: book,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('创建图书错误:', error)
    console.error('错误详情:', error instanceof Error ? error.message : String(error))
    console.error('错误堆栈:', error instanceof Error ? error.stack : '')
    return NextResponse.json(
      {
        success: false,
        message: '创建图书失败',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

