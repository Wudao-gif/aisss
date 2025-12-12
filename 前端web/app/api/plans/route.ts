import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// 获取用户的计划列表
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { success: false, message: '未提供认证令牌' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: '无效的认证令牌' },
        { status: 401 }
      )
    }

    const plans = await prisma.plan.findMany({
      where: {
        userId: decoded.userId,
      },
      include: {
        files: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            files: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: plans,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取计划列表错误:', error)
    return NextResponse.json(
      { success: false, message: '获取计划列表失败' },
      { status: 500 }
    )
  }
}

// 创建新计划
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { success: false, message: '未提供认证令牌' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: '无效的认证令牌' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: '请提供计划名称' },
        { status: 400 }
      )
    }

    const plan = await prisma.plan.create({
      data: {
        userId: decoded.userId,
        name: name.trim(),
        description: description?.trim() || null,
      },
      include: {
        files: true,
        _count: {
          select: {
            files: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: '计划创建成功',
        data: plan,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('创建计划错误:', error)
    return NextResponse.json(
      { success: false, message: '创建计划失败' },
      { status: 500 }
    )
  }
}

