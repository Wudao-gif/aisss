import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// GET /api/plans/[planId]/files/[fileId] - 获取单个文件详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; fileId: string }> }
) {
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

    const { planId, fileId } = await params

    // 验证计划存在且属于当前用户
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

    if (plan.userId !== decoded.userId) {
      return NextResponse.json(
        { success: false, message: '无权访问此计划' },
        { status: 403 }
      )
    }

    // 获取文件详情
    const file = await prisma.planFile.findUnique({
      where: {
        id: fileId,
      },
    })

    if (!file) {
      return NextResponse.json(
        { success: false, message: '文件不存在' },
        { status: 404 }
      )
    }

    // 验证文件属于该计划
    if (file.planId !== planId) {
      return NextResponse.json(
        { success: false, message: '文件不属于该计划' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: file,
    })
  } catch (error) {
    console.error('获取文件详情错误:', error)
    return NextResponse.json(
      { success: false, message: '获取文件详情失败' },
      { status: 500 }
    )
  }
}

