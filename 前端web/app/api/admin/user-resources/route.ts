/**
 * 用户资源管理 API
 * 获取所有用户上传的资源列表（从 UserUploadedResource 表）
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'

// 获取用户资源列表
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
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = 20
    const search = searchParams.get('search') || ''

    // 构建查询条件
    const where: any = {}

    // 如果有搜索关键词，只搜索资源名称
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    // 获取总数
    const total = await prisma.userUploadedResource.count({ where })

    // 获取资源列表
    const resources = await prisma.userUploadedResource.findMany({
      where,
      include: {
        bookshelfResources: {
          include: {
            bookshelfItem: {
              include: {
                book: {
                  select: {
                    id: true,
                    name: true,
                    author: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // 获取所有用户ID
    const userIds = [...new Set(resources.map(r => r.userId))]

    // 查询用户信息
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        email: true,
        realName: true,
        university: true,
      },
    })

    // 创建用户映射
    const userMap = new Map(users.map(u => [u.id, u]))

    // 组合数据
    const resourcesWithUser = resources.map(resource => ({
      ...resource,
      user: userMap.get(resource.userId),
      // 统计被引用次数
      referenceCount: resource.bookshelfResources.length,
    }))

    return NextResponse.json(
      {
        success: true,
        data: resourcesWithUser,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取用户资源列表错误:', error)
    return NextResponse.json(
      { success: false, message: '获取资源列表失败' },
      { status: 500 }
    )
  }
}

// 删除用户资源（管理员）- 永久删除包括 OSS 文件
export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少资源 ID' },
        { status: 400 }
      )
    }

    // 检查资源是否存在
    const resource = await prisma.userUploadedResource.findUnique({
      where: { id },
      include: {
        bookshelfResources: true,
      },
    })

    if (!resource) {
      return NextResponse.json(
        { success: false, message: '资源不存在' },
        { status: 404 }
      )
    }

    // 使用事务删除：先删除所有引用，再删除资源本身
    await prisma.$transaction(async (tx) => {
      // 1. 删除所有 BookshelfResource 引用
      await tx.bookshelfResource.deleteMany({
        where: {
          userUploadedResourceId: id,
        },
      })

      // 2. 删除 UserUploadedResource 记录
      await tx.userUploadedResource.delete({
        where: { id },
      })
    })

    // 3. 删除 OSS 文件（在事务外执行，避免影响数据库操作）
    try {
      const { deleteFromOSS } = await import('@/lib/oss')
      await deleteFromOSS(resource.fileUrl, false)
    } catch (error) {
      console.error('删除 OSS 文件失败:', error)
      // 不影响资源删除，只记录错误
    }

    return NextResponse.json(
      {
        success: true,
        message: '资源删除成功',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('删除资源错误:', error)
    return NextResponse.json(
      { success: false, message: '删除资源失败' },
      { status: 500 }
    )
  }
}

