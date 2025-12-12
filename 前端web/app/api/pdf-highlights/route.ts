/**
 * PDF 高亮 API
 * GET - 获取用户的高亮列表
 * POST - 创建新高亮
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// 获取高亮列表
export async function GET(request: NextRequest) {
  try {
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
        { success: false, message: '登录已过期' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('bookId')
    const fileUrl = searchParams.get('fileUrl')

    if (!bookId && !fileUrl) {
      return NextResponse.json(
        { success: false, message: '请提供 bookId 或 fileUrl' },
        { status: 400 }
      )
    }

    const highlights = await prisma.pdfHighlight.findMany({
      where: {
        userId: decoded.userId,
        ...(bookId ? { bookId } : { fileUrl: fileUrl || undefined }),
      },
      orderBy: [
        { pageIndex: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      data: highlights,
    })
  } catch (error) {
    console.error('获取高亮失败:', error)
    return NextResponse.json(
      { success: false, message: '获取高亮失败' },
      { status: 500 }
    )
  }
}

// 创建高亮
export async function POST(request: NextRequest) {
  try {
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
        { success: false, message: '登录已过期' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { bookId, fileUrl, pageIndex, content, color, highlightAreas, note } = body

    if (!bookId && !fileUrl) {
      return NextResponse.json(
        { success: false, message: '请提供 bookId 或 fileUrl' },
        { status: 400 }
      )
    }

    if (pageIndex === undefined || !content || !highlightAreas) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      )
    }

    const highlight = await prisma.pdfHighlight.create({
      data: {
        userId: decoded.userId,
        bookId: bookId || null,
        fileUrl: fileUrl || '',
        pageIndex,
        content,
        color: color || '#FFEB3B',
        highlightAreas,
        note: note || null,
      },
    })

    console.log('🖍️ [高亮] 创建成功:', highlight.id)

    return NextResponse.json({
      success: true,
      data: highlight,
    })
  } catch (error) {
    console.error('创建高亮失败:', error)
    return NextResponse.json(
      { success: false, message: '创建高亮失败' },
      { status: 500 }
    )
  }
}

