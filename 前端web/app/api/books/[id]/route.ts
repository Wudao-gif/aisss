/**
 * 客户端 - 图书详情 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 获取图书详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const book = await prisma.book.findUnique({
      where: {
        id: id,
      },
      include: {
        _count: {
          select: {
            bookshelf: true,
            resources: true,  // 关系字段名是 resources
          },
        },
      },
    })

    if (!book) {
      return NextResponse.json(
        { success: false, message: '图书不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: book,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取图书详情错误:', error)
    return NextResponse.json(
      { success: false, message: '获取图书详情失败' },
      { status: 500 }
    )
  }
}

