/**
 * 管理后台 - 大学管理 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'

// 获取大学列表
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

    // 构建查询条件
    const where: any = {}

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    // 获取大学列表，包含资源数量统计
    const universities = await prisma.university.findMany({
      where,
      include: {
        _count: {
          select: {
            bookResources: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // 获取每个大学的用户数量
    const universitiesWithUserCount = await Promise.all(
      universities.map(async (university) => {
        const userCount = await prisma.user.count({
          where: {
            university: university.name,
          },
        })

        return {
          ...university,
          userCount,
        }
      })
    )

    return NextResponse.json(
      {
        success: true,
        data: universitiesWithUserCount,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取大学列表错误:', error)
    return NextResponse.json(
      { success: false, message: '获取大学列表失败' },
      { status: 500 }
    )
  }
}

// 创建大学
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
    const { name, logoUrl } = body

    // 验证必填字段
    if (!name) {
      return NextResponse.json(
        { success: false, message: '请输入大学名称' },
        { status: 400 }
      )
    }

    // 检查大学名称是否已存在
    const existingUniversity = await prisma.university.findUnique({
      where: { name },
    })

    if (existingUniversity) {
      return NextResponse.json(
        { success: false, message: '大学名称已存在' },
        { status: 400 }
      )
    }

    // 创建大学
    const university = await prisma.university.create({
      data: {
        name,
        logoUrl: logoUrl || null,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: '大学创建成功',
        data: university,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('创建大学错误:', error)
    return NextResponse.json(
      { success: false, message: '创建大学失败' },
      { status: 500 }
    )
  }
}

