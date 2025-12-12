import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 获取图书列表（所有用户都能看到所有图书）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // 构建查询条件
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { isbn: { contains: search, mode: 'insensitive' } },
      ]
    }

    const books = await prisma.book.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: books,
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

// 创建图书（管理员功能）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, author, isbn, publisher, coverUrl } = body

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
        { success: false, message: '该 ISBN 已存在' },
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
      },
    })

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
    return NextResponse.json(
      { success: false, message: '创建图书失败' },
      { status: 500 }
    )
  }
}

