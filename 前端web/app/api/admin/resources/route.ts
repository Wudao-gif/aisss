/**
 * 管理后台 - 资源管理 API
 * 支持资源绑定多个教材
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'

// 获取资源列表
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
    const universityId = searchParams.get('universityId')
    const bookId = searchParams.get('bookId')

    // 构建查询条件
    const where: any = {}
    if (universityId) {
      where.universityId = universityId
    }

    // 获取资源列表
    const resources = await prisma.bookResource.findMany({
      where,
      include: {
        university: true,
        books: {
          include: {
            book: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 如果指定了 bookId，只返回该图书的资源
    let filteredResources = resources
    if (bookId) {
      filteredResources = resources.filter((resource) =>
        resource.books.some((rel) => rel.bookId === bookId)
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: filteredResources,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取资源列表错误:', error)
    return NextResponse.json(
      { success: false, message: '获取资源列表失败' },
      { status: 500 }
    )
  }
}

// 创建资源（必须选择一本教材，可以为多个大学创建）
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
    const { bookId, universityIds, name, description, fileUrl, fileType, fileSize, allowReading } = body

    // 验证必填字段
    if (!bookId || !name || !fileUrl || !fileType || !fileSize) {
      return NextResponse.json(
        { success: false, message: '请填写所有必填字段' },
        { status: 400 }
      )
    }

    // 验证必须选择至少一个大学
    if (!universityIds || !Array.isArray(universityIds) || universityIds.length === 0) {
      return NextResponse.json(
        { success: false, message: '资源必须至少选择一个大学' },
        { status: 400 }
      )
    }

    // 检查教材是否存在
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    })

    if (!book) {
      return NextResponse.json(
        { success: false, message: '教材不存在' },
        { status: 404 }
      )
    }

    // 检查所有大学是否存在
    const universities = await prisma.university.findMany({
      where: { id: { in: universityIds } },
    })

    if (universities.length !== universityIds.length) {
      return NextResponse.json(
        { success: false, message: '部分大学不存在' },
        { status: 404 }
      )
    }

    // 为每个大学创建资源并关联到教材（使用事务）
    const resources = await prisma.$transaction(async (tx) => {
      const createdResources = []

      for (const universityId of universityIds) {
        // 创建资源
        const newResource = await tx.bookResource.create({
          data: {
            universityId,
            name,
            description: description || null,
            fileUrl,
            fileType,
            fileSize,
            allowReading: allowReading || false,
          },
          include: {
            university: true,
          },
        })

        // 创建资源与教材的关联
        await tx.bookResourceRelation.create({
          data: {
            resourceId: newResource.id,
            bookId,
          },
        })

        createdResources.push(newResource)
      }

      return createdResources
    })

    return NextResponse.json(
      {
        success: true,
        message: `成功为 ${universityIds.length} 个大学创建资源`,
        data: resources,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('创建资源错误:', error)
    return NextResponse.json(
      { success: false, message: '创建资源失败' },
      { status: 500 }
    )
  }
}

