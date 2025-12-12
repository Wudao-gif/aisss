/**
 * 管理后台 - 用户管理 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'

// 获取用户列表
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
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { realName: { contains: search, mode: 'insensitive' } },
        { university: { contains: search, mode: 'insensitive' } },
      ]
    }

    // 获取总数
    const total = await prisma.user.count({ where })

    // 获取用户列表
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        phone: true,
        realName: true,
        university: true,
        role: true,
        isBanned: true,
        lastLoginIp: true,
        lastLoginCity: true,
        createdAt: true,
        _count: {
          select: {
            bookshelf: true,
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
          users,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取用户列表错误:', error)
    return NextResponse.json(
      { success: false, message: '获取用户列表失败' },
      { status: 500 }
    )
  }
}

