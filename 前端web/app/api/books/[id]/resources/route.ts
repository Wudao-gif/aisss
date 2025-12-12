/**
 * 客户端 - 获取图书资源列表
 * 根据用户所在大学返回对应的资源
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// 获取图书资源列表（根据用户大学）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 验证用户登录
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: '登录已过期' },
        { status: 401 }
      )
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

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

    // 查找用户所在大学
    const university = await prisma.university.findUnique({
      where: { name: user.university || undefined },
    })

    if (!university) {
      // 如果用户的大学不存在，返回空资源列表
      return NextResponse.json(
        {
          success: true,
          data: [],
        },
        { status: 200 }
      )
    }

    // 通过关联表获取该大学的图书资源
    const resourceRelations = await prisma.bookResourceRelation.findMany({
      where: {
        bookId: id,
      },
      include: {
        resource: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // 筛选出该大学的资源
    const resources = resourceRelations
      .map((rel) => rel.resource)
      .filter((resource) => resource.universityId === university.id)

    return NextResponse.json(
      {
        success: true,
        data: resources,
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

