import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// 获取用户书架
export async function GET(request: NextRequest) {
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

    // 获取用户书架
    const bookshelfItems = await prisma.bookshelfItem.findMany({
      where: {
        userId: decoded.userId,
      },
      include: {
        book: true,
      },
      orderBy: {
        addedAt: 'desc',
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: bookshelfItems,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取书架错误:', error)
    return NextResponse.json(
      { success: false, message: '获取书架失败' },
      { status: 500 }
    )
  }
}

// 添加图书到书架
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { bookId, resourceIds } = body // resourceIds 可选，用于选择性添加资源

    if (!bookId) {
      return NextResponse.json(
        { success: false, message: '请提供图书 ID' },
        { status: 400 }
      )
    }

    // 检查图书是否存在
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    })

    if (!book) {
      return NextResponse.json(
        { success: false, message: '图书不存在' },
        { status: 404 }
      )
    }

    // 检查是否已添加
    const existingItem = await prisma.bookshelfItem.findUnique({
      where: {
        userId_bookId: {
          userId: decoded.userId,
          bookId,
        },
      },
    })

    if (existingItem) {
      return NextResponse.json(
        { success: false, message: '该图书已在书架中' },
        { status: 400 }
      )
    }

    // 获取该图书的所有资源
    const bookResources = await prisma.bookResourceRelation.findMany({
      where: { bookId },
      include: {
        resource: {
          include: {
            university: true,
          },
        },
      },
    })

    // 使用事务：添加到书架 + 创建资源快照
    const bookshelfItem = await prisma.$transaction(async (tx) => {
      // 1. 添加到书架
      const newBookshelfItem = await tx.bookshelfItem.create({
        data: {
          userId: decoded.userId,
          bookId,
        },
      })

      // 2. 创建资源快照
      // 如果提供了 resourceIds，只添加选中的资源；否则添加所有资源
      let resourcesToAdd = bookResources
      if (resourceIds && Array.isArray(resourceIds) && resourceIds.length > 0) {
        resourcesToAdd = bookResources.filter((rel) =>
          resourceIds.includes(rel.resource.id)
        )
      }

      if (resourcesToAdd.length > 0) {
        await tx.bookshelfResource.createMany({
          data: resourcesToAdd.map((rel) => ({
            bookshelfItemId: newBookshelfItem.id,
            resourceId: rel.resource.id,
            userId: decoded.userId,
            name: rel.resource.name,
            description: rel.resource.description,
            fileUrl: rel.resource.fileUrl,
            fileType: rel.resource.fileType,
            fileSize: rel.resource.fileSize,
            allowReading: rel.resource.allowReading,
            isUserUploaded: false, // 官方资源
          })),
        })
      }

      return newBookshelfItem
    })

    // 返回完整的书架项（包括资源）
    const fullBookshelfItem = await prisma.bookshelfItem.findUnique({
      where: { id: bookshelfItem.id },
      include: {
        book: true,
        resources: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: '添加成功',
        data: fullBookshelfItem,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('添加到书架错误:', error)
    return NextResponse.json(
      { success: false, message: '添加到书架失败' },
      { status: 500 }
    )
  }
}

// 从书架移除图书
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('bookId')

    if (!bookId) {
      return NextResponse.json(
        { success: false, message: '请提供图书 ID' },
        { status: 400 }
      )
    }

    // 检查是否存在
    const existingItem = await prisma.bookshelfItem.findUnique({
      where: {
        userId_bookId: {
          userId: decoded.userId,
          bookId,
        },
      },
    })

    if (!existingItem) {
      return NextResponse.json(
        { success: false, message: '该图书不在书架中' },
        { status: 404 }
      )
    }

    // 从书架移除
    await prisma.bookshelfItem.delete({
      where: {
        id: existingItem.id,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: '移除成功',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('从书架移除错误:', error)
    return NextResponse.json(
      { success: false, message: '从书架移除失败' },
      { status: 500 }
    )
  }
}

