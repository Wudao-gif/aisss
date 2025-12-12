import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// 获取计划的文件列表
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

    const files = await prisma.planFile.findMany({
      where: {
        planId: planId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: files,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取计划文件列表错误:', error)
    return NextResponse.json(
      { success: false, message: '获取文件列表失败' },
      { status: 500 }
    )
  }
}

// 上传文件到计划
export async function POST(
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

    const body = await request.json()
    const { name, description, fileUrl, fileType, fileSize } = body

    if (!name || !fileUrl || !fileType || !fileSize) {
      return NextResponse.json(
        { success: false, message: '缺少必要的文件信息' },
        { status: 400 }
      )
    }

    const planFile = await prisma.planFile.create({
      data: {
        planId: planId,
        userId: decoded.userId,
        name,
        description: description || null,
        fileUrl,
        fileType,
        fileSize,
        allowReading: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: '文件上传成功',
        data: planFile,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('上传文件到计划错误:', error)
    return NextResponse.json(
      { success: false, message: '上传文件失败' },
      { status: 500 }
    )
  }
}

