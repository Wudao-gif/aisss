import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// 获取计划详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params

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

    const plan = await prisma.plan.findUnique({
      where: {
        id: planId,
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
    })

    if (!plan) {
      return NextResponse.json(
        { success: false, message: '计划不存在' },
        { status: 404 }
      )
    }

    // 验证权限
    if (plan.userId !== decoded.userId) {
      return NextResponse.json(
        { success: false, message: '无权访问此计划' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: plan,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ [获取计划详情] 错误:', error)
    console.error('❌ [获取计划详情] 错误详情:', error instanceof Error ? error.message : String(error))
    console.error('❌ [获取计划详情] 错误堆栈:', error instanceof Error ? error.stack : '')
    return NextResponse.json(
      {
        success: false,
        message: '获取计划详情失败',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// 删除计划
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params

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

    const plan = await prisma.plan.findUnique({
      where: {
        id: planId,
      },
    })

    if (!plan) {
      return NextResponse.json(
        { success: false, message: '计划不存在' },
        { status: 404 }
      )
    }

    // 验证权限
    if (plan.userId !== decoded.userId) {
      return NextResponse.json(
        { success: false, message: '无权删除此计划' },
        { status: 403 }
      )
    }

    await prisma.plan.delete({
      where: {
        id: planId,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: '计划删除成功',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('删除计划错误:', error)
    return NextResponse.json(
      { success: false, message: '删除计划失败' },
      { status: 500 }
    )
  }
}

