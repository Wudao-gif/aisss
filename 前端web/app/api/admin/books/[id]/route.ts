/**
 * 管理后台 - 编辑/删除图书 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'
import { deleteFromOSS, getOssPathFromUrl } from '@/lib/oss'
import { processUploadedDocument, deleteDocumentVectors } from '@/lib/ai-service'

// 更新图书
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 验证管理员权限
  const authResult = await verifyAdmin(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: 401 }
    )
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { name, author, isbn, publisher, coverUrl, fileUrl, fileSize, allowReading } = body

    // 检查图书是否存在
    const book = await prisma.book.findUnique({
      where: { id },
    })

    if (!book) {
      return NextResponse.json(
        { success: false, message: '图书不存在' },
        { status: 404 }
      )
    }

    // 如果修改了 ISBN，检查是否与其他图书冲突
    if (isbn && isbn !== book.isbn) {
      const existingBook = await prisma.book.findUnique({
        where: { isbn },
      })

      if (existingBook) {
        return NextResponse.json(
          { success: false, message: 'ISBN 已存在' },
          { status: 400 }
        )
      }
    }

    // 检查是否更换了图书文件
    const fileChanged = fileUrl !== undefined && fileUrl !== book.fileUrl

    // 更新图书
    const updatedBook = await prisma.book.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(author && { author }),
        ...(isbn && { isbn }),
        ...(publisher && { publisher }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(fileSize !== undefined && { fileSize }),
        ...(allowReading !== undefined && { allowReading }),
      },
    })

    // 如果更换了图书文件，重新处理向量
    if (fileChanged && fileUrl) {
      // 先删除旧的向量
      deleteDocumentVectors(id).catch(err => {
        console.error('❌ [AI Service] 删除旧向量失败:', err)
      })

      // 处理新文件
      const ossPath = getOssPathFromUrl(fileUrl)
      if (ossPath) {
        processUploadedDocument(ossPath, {
          book_id: id,
          name: updatedBook.name,
          type: 'book',
        }).catch(err => {
          console.error('❌ [AI Service] 图书文件处理失败:', err)
        })
        console.log('🤖 [更新图书] 已提交 AI 处理任务:', ossPath, '| bookId:', id)
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: '图书更新成功',
        data: updatedBook,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('更新图书错误:', error)
    return NextResponse.json(
      { success: false, message: '更新图书失败' },
      { status: 500 }
    )
  }
}

// 删除图书
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 验证管理员权限
  const authResult = await verifyAdmin(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: 401 }
    )
  }

  try {
    const { id } = await params

    // 检查图书是否存在
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bookshelf: true,
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

    // 删除 OSS 文件
    try {
      // 删除封面（公共 Bucket）
      if (book.coverUrl) {
        await deleteFromOSS(book.coverUrl, true)
      }
      // 删除图书文件（私有 Bucket）
      if (book.fileUrl) {
        await deleteFromOSS(book.fileUrl, false)
      }
    } catch (error) {
      console.error('删除 OSS 文件失败:', error)
      // 继续删除数据库记录，即使 OSS 删除失败
    }

    // 删除图书（会级联删除书架中的记录和资源）
    await prisma.book.delete({
      where: { id },
    })

    return NextResponse.json(
      {
        success: true,
        message: '图书删除成功',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('删除图书错误:', error)
    return NextResponse.json(
      { success: false, message: '删除图书失败' },
      { status: 500 }
    )
  }
}

